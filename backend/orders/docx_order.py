"""Сборка предписания в формате Word (.docx).

Раньше предписание отдавалось как HTML с расширением .doc. На компьютере
Word такой файл ещё открывал, а на телефоне — нет: он считает файл битым.
Здесь собирается настоящий документ Word, который открывается везде.
"""

import io

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ACCENT = RGBColor(0x1F, 0x3A, 0x6E)
GREY = RGBColor(0x66, 0x66, 0x66)
RED = RGBColor(0xB3, 0x26, 0x1E)

MONTHS = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]


def ru_date(value):
    """Дата словами: 7 октября 2026 г."""
    if not value:
        return '—'
    text = str(value)[:10]
    try:
        if '.' in text:
            day, month, year = text.split('.')
        else:
            year, month, day = text.split('-')
        return f'{int(day)} {MONTHS[int(month) - 1]} {year} г.'
    except Exception:
        return text


def shade(cell, color):
    el = OxmlElement('w:shd')
    el.set(qn('w:val'), 'clear')
    el.set(qn('w:fill'), color)
    cell._tc.get_or_add_tcPr().append(el)


def set_font(doc):
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    style.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    fmt = style.paragraph_format
    fmt.space_after = Pt(4)
    fmt.line_spacing = 1.15


def para(doc, text='', size=12, bold=False, italic=False, color=None,
         align=None, space_before=0, space_after=4):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    if text:
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        run.font.size = Pt(size)
        if color is not None:
            run.font.color.rgb = color
    return p


def kv_table(doc, rows):
    """Таблица «поле — значение» для реквизитов."""
    table = doc.add_table(rows=0, cols=2)
    table.style = 'Table Grid'
    for name, value in rows:
        cells = table.add_row().cells
        cells[0].width = Cm(5.5)
        cells[1].width = Cm(11.5)
        shade(cells[0], 'F2F4F8')
        for cell, text, bold in ((cells[0], name, False), (cells[1], value or '—', True)):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(str(text))
            run.bold = bold
            run.font.size = Pt(11)
    return table


def violations_table(doc, items, common_deadline):
    """Таблица выявленных нарушений."""
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Table Grid'
    head = table.rows[0].cells
    titles = ('№', 'Выявленное нарушение', 'Норматив', 'Устранить до')
    widths = (Cm(1.0), Cm(9.0), Cm(5.0), Cm(2.5))
    for cell, title, width in zip(head, titles, widths):
        cell.width = width
        shade(cell, 'E8ECF4')
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(title)
        run.bold = True
        run.font.size = Pt(10)

    for i, it in enumerate(items, 1):
        cells = table.add_row().cells
        values = (
            str(i),
            str(it.get('title') or '—'),
            str(it.get('normRef') or 'норматив не указан'),
            str(it.get('deadline') or common_deadline or '—'),
        )
        for cell, text, width in zip(cells, values, widths):
            cell.width = width
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(text)
            run.font.size = Pt(10)
    return table


def sign_table(doc, rows):
    """Подписи сторон."""
    table = doc.add_table(rows=0, cols=2)
    table.style = 'Table Grid'
    for name, who in rows:
        cells = table.add_row().cells
        cells[0].width = Cm(8.5)
        cells[1].width = Cm(8.5)
        for cell, text in ((cells[0], name), (cells[1], who)):
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(10)
            run = p.add_run(text)
            run.font.size = Pt(10)
    return table


def build_order_docx(order, contractor=None):
    """Формирует .docx предписания и возвращает его байты."""
    doc = Document()
    set_font(doc)

    section = doc.sections[0]
    section.top_margin = Cm(1.6)
    section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(1.4)

    body = order.get('body') or {}
    items = body.get('items') or []
    contractor = contractor or {}

    org = body.get('inspectionOrg') or 'Организация строительного контроля'
    para(doc, org, size=11, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    para(doc, 'Служба строительного контроля', size=9.5, italic=True, color=GREY,
         align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)

    para(doc, f"ПРЕДПИСАНИЕ № {order.get('number') or '—'}", size=15, bold=True,
         color=ACCENT, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    para(doc, 'об устранении выявленных нарушений', size=11, color=GREY,
         align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)

    kv_table(doc, [
        ('Дата выдачи', ru_date(order.get('createdAt'))),
        ('Объект', body.get('objectTitle')),
        ('Шифр объекта', body.get('objectCode')),
        ('Заказчик', body.get('customerName')),
        ('Кому выдано', order.get('issuedTo') or contractor.get('name')),
        ('ИНН', contractor.get('inn')),
        ('Адрес', contractor.get('address')),
        ('Руководитель', contractor.get('director')),
        ('Генподрядчик', body.get('generalContractor')),
        ('Субподрядчик', body.get('subcontractor')),
        ('Вид работ', body.get('workType')),
        ('Раздел проекта', body.get('docRef')),
        ('Представитель подрядчика', body.get('contractorRep')),
        ('Предписание выдал', order.get('inspector')),
        ('Срок устранения', order.get('deadline')),
    ])

    para(doc, 'Выявленные нарушения', size=12.5, bold=True, color=ACCENT,
         space_before=14, space_after=6)

    if items:
        violations_table(doc, items, order.get('deadline'))
    else:
        para(doc, 'Нарушения не перечислены.', italic=True, color=GREY)

    if order.get('stopWorks'):
        para(doc, 'РАБОТЫ ПРИОСТАНОВЛЕНЫ до устранения выявленных нарушений.',
             size=11.5, bold=True, color=RED, space_before=10, space_after=4)

    para(doc,
         'Об устранении нарушений сообщить в письменном виде в адрес службы '
         'строительного контроля в указанный срок. При невыполнении предписания '
         'работы могут быть приостановлены.',
         size=10, italic=True, color=GREY, space_before=10, space_after=12)

    sign_table(doc, [
        ('Предписание выдал', str(order.get('inspector') or '')),
        ('Предписание получил', str(body.get('contractorRep') or '')),
    ])

    para(doc, 'Подпись, расшифровка, дата', size=8.5, italic=True, color=GREY,
         space_before=2)

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()
