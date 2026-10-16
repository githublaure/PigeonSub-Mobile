export interface FamilySharing {
  shareable: boolean;
  totalSeats: number | null;
  occupiedSeats: number | null;
  receivedContribution: string | null;
  estimatedContribution: string | null;
  frequency: string;
}
export type FamilySharingInput = Omit<FamilySharing, 'frequency'>;
export function validateFamilySharing(input: unknown, price: string | number, frequency: string): FamilySharing;
