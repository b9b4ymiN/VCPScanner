export function getBoardLot(price: number): number {
  if (price < 0.25) return 10_000
  if (price < 0.50) return 5_000
  if (price < 1.00) return 2_000
  if (price < 2.50) return 1_000
  if (price < 5.00) return 500
  if (price < 10.00) return 200
  return 100
}
