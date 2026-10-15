'use strict';
// One validator for the API and local/demo storage. No identity or Plus claim
// supplied by the client is used here; authorization belongs to each adapter.
function validateFamilySharing(input, price, frequency) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.shareable !== 'boolean')
    throw new Error('Partage familial invalide.');
  const seat = (value, minimum) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > 100)
      throw new Error('Indiquez un nombre entier de places, entre 0 et 100.');
    return value;
  };
  const amount = value => {
    if (value == null || value === '') return null;
    if (!['string', 'number'].includes(typeof value) || !/^\d+(?:[.,]\d{1,2})?$/.test(String(value)))
      throw new Error('Indiquez un montant positif avec au plus deux décimales.');
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number) || number < 0 || number > Number(price))
      throw new Error('Une contribution ne peut pas dépasser le prix fournisseur.');
    return number.toFixed(2);
  };
  const totalSeats = seat(input.totalSeats, 1), occupiedSeats = seat(input.occupiedSeats, 0);
  if (occupiedSeats !== null && totalSeats !== null && occupiedSeats > totalSeats)
    throw new Error('Les places occupées dépassent le nombre de places autorisées.');
  if (!['weekly', 'monthly', 'yearly', 'lifetime'].includes(frequency)) throw new Error('Fréquence invalide.');
  return { shareable: input.shareable, totalSeats, occupiedSeats,
    receivedContribution: amount(input.receivedContribution), estimatedContribution: amount(input.estimatedContribution), frequency };
}
module.exports = { validateFamilySharing };
