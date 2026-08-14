import StoreClient from './store-client'

export default function StorePage({ params }: { params: { subdomain: string } }) {
  return <StoreClient subdomain={params.subdomain} />
}
