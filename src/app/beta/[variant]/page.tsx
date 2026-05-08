import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ variant: string }>
}

export default async function BetaVariantRedirect({ params }: Props) {
  const { variant } = await params
  redirect(`/exp5/${variant === 'continuous' ? 'continuous' : 'integer'}`)
}
