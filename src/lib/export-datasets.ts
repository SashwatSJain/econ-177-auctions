export type ExportDatasetKey = 'auctions' | 'risk-aversion' | 'seller-reserve' | 'exp4-group'

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
  {
    key: 'exp4-group',
    title: 'Jar of Kernels — Group Data',
    description: 'Experiment 4 group data: all 10 members\' estimates and bids. Your perm is shown; others are anonymized.',
    filenameSuffix: 'exp4-group',
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
