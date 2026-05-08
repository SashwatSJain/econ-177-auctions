import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ type: string }>
}

export default async function AuctionRedirect({ params }: Props) {
  const { type } = await params
  redirect(`/exp1/${type}`)
}
