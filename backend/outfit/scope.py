"""Привязка каждого запроса к компании.

Посредник базы не передаёт настройки соединения, поэтому полагаться на
правила внутри базы нельзя. Вместо этого каждый запрос перед отправкой
разбирается и дополняется условием «только строки этой компании»:
чтение, правка и удаление видят лишь свои строки, новые строки получают
метку компании. Запрос, который не удалось разобрать, для других компаний
не выполняется вовсе.
"""

import sqlglot
from sqlglot import exp

TENANT_TABLES = frozenset((
    'asset_timesheet,cabinet_archive,contract_acts,contractors,contracts,cust_letters,'
    'cust_points,cust_replies,daily_inspector_reports,daily_reports,doc_checks,doc_defects,'
    'doc_files,doc_review_files,doc_review_notes,doc_review_pages,doc_reviews,documents,'
    'equipment_items,equipment_moves,fleet_acts,fleet_days,fleet_expenses,fleet_maint,'
    'fleet_repairs,fleet_shifts,folder_photos,inspection_defects,inspections,'
    'inspector_journal,locations,object_contractors,object_docs,object_load,objects,orders,'
    'part_requests,photo_folders,ppe_items,ppe_writeoffs,project_fields,requests,settings,'
    'signed_docs,timesheet,track_consent,track_days,track_month,track_points,users,'
    'vehicle_logs,vehicles,waybills'
).split(','))


class ScopeError(Exception):
    pass


def _is_tenant(t) -> bool:
    return isinstance(t, exp.Table) and t.name.lower() in TENANT_TABLES


def _cond(t: exp.Table, company: str):
    ref = t.alias_or_name
    return exp.EQ(this=exp.column('company_id', table=ref), expression=exp.Literal.string(company))


def _add_where(node, cond):
    where = node.args.get('where')
    node.set('where', exp.Where(this=exp.and_(where.this, cond, copy=False) if where else cond))


def _scope_select(sel: exp.Select, company: str):
    frm = sel.args.get('from')
    if frm is not None:
        for t in [frm.this] + list(frm.expressions or []):
            if _is_tenant(t):
                _add_where(sel, _cond(t, company))
    for j in sel.args.get('joins') or []:
        t = j.this
        if _is_tenant(t):
            on = j.args.get('on')
            if on is not None:
                j.set('on', exp.and_(on, _cond(t, company), copy=False))
            elif j.args.get('using'):
                raise ScopeError('join using')
            else:
                _add_where(sel, _cond(t, company))


def _scope_insert(ins: exp.Insert, company: str):
    target = ins.this
    tbl = target.this if isinstance(target, exp.Schema) else target
    if not _is_tenant(tbl):
        return
    if not isinstance(target, exp.Schema):
        raise ScopeError('insert without column list')
    cols = [c.name.lower() for c in target.expressions]
    src = ins.expression
    if 'company_id' in cols:
        idx = cols.index('company_id')
        if isinstance(src, exp.Values):
            for row in src.expressions:
                row.expressions[idx] = exp.Literal.string(company)
        elif isinstance(src, exp.Select):
            src.expressions[idx] = exp.Literal.string(company)
        else:
            raise ScopeError('insert source')
        return
    target.append('expressions', exp.to_identifier('company_id'))
    if isinstance(src, exp.Values):
        for row in src.expressions:
            row.append('expressions', exp.Literal.string(company))
    elif isinstance(src, exp.Select):
        src.append('expressions', exp.Literal.string(company))
    else:
        raise ScopeError('insert source')


def _scope_tree(stmt, company: str):
    for ins in list(stmt.find_all(exp.Insert)):
        _scope_insert(ins, company)
    for upd in list(stmt.find_all(exp.Update)):
        if _is_tenant(upd.this):
            _add_where(upd, _cond(upd.this, company))
        frm = upd.args.get('from')
        if frm is not None and _is_tenant(frm.this):
            _add_where(upd, _cond(frm.this, company))
    for dl in list(stmt.find_all(exp.Delete)):
        if _is_tenant(dl.this):
            _add_where(dl, _cond(dl.this, company))
        if dl.args.get('using'):
            raise ScopeError('delete using')
    for sel in list(stmt.find_all(exp.Select)):
        _scope_select(sel, company)


def _touches_tenant(sql: str) -> bool:
    low = sql.lower()
    return any(t in low for t in TENANT_TABLES)


def _conflict_guards(stmt, company):
    """Обновление при конфликте не должно трогать строку другой компании."""
    guards = []
    for ins in stmt.find_all(exp.Insert):
        oc = ins.args.get('conflict')
        if oc is None:
            continue
        if not str(oc.args.get('action') or '').upper().startswith('DO UPDATE') and not oc.expressions:
            continue
        target = ins.this
        tbl = target.this if isinstance(target, exp.Schema) else target
        if _is_tenant(tbl):
            guards.append(f"{tbl.name}.company_id = '{company}'")
    if len(guards) > 1:
        raise ScopeError('several upserts')
    return guards


def _apply_guard(sql: str, guards):
    cond = ' WHERE ' + guards[0]
    i = sql.upper().rfind(' RETURNING ')
    return sql[:i] + cond + sql[i:] if i > 0 else sql + cond


def scope(sql: str, company: str) -> str:
    """Возвращает запрос, ограниченный строками компании."""
    if not isinstance(sql, str) or not _touches_tenant(sql):
        return sql
    try:
        trees = sqlglot.parse(sql, read='postgres')
    except Exception as e:
        raise ScopeError(f'parse: {e}') from e
    out = []
    for stmt in trees:
        if stmt is None:
            continue
        if isinstance(stmt, exp.Command):
            raise ScopeError('unsupported statement')
        guards = _conflict_guards(stmt, company)
        _scope_tree(stmt, company)
        sql_out = stmt.sql(dialect='postgres')
        if guards:
            sql_out = _apply_guard(sql_out, guards)
        out.append(sql_out)
    return '; '.join(out)
