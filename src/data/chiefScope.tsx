import { ReactNode, createContext } from 'react';

export interface ChiefScopeOverride {
  objectIds: string[];
  chiefFio?: string;
}

export const ChiefScopeContext = createContext<ChiefScopeOverride | null>(null);

const ChiefScopeProvider = ({
  value,
  children,
}: {
  value: ChiefScopeOverride;
  children: ReactNode;
}) => <ChiefScopeContext.Provider value={value}>{children}</ChiefScopeContext.Provider>;

export default ChiefScopeProvider;
