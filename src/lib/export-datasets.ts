export type ExportDatasetKey = 'auctions' | 'risk-aversion' | 'seller-reserve'

export const EXPORT_DATASETS = [
  {
    key: 'auctions',
    title: 'Auction Experiments',
    description: 'Eight bidder-side auction treatments from Experiment 1.',
    filenameSuffix: 'auction-experiments',
  },
  {
    key: 'risk-aversion',
    title: 'Risk Aversion / CRRA',
    description: 'Experiment 2 risk-preference elicitation responses.',
    filenameSuffix: 'risk-aversion-crra',
  },
  {
    key: 'seller-reserve',
    title: 'Seller Reserve Auction',
    description: 'Experiment 3 seller-side reserve-setting rounds.',
    filenameSuffix: 'seller-reserve-auction',
  },
] as const satisfies ReadonlyArray<{
  key: ExportDatasetKey
  title: string
  description: string
  filenameSuffix: string
}>

export function getExportDataset(key: string) {
  return EXPORT_DATASETS.find((dataset) => dataset.key === key)
}
