export default function StructuredData() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ScamHawk',
    url: 'https://scamhawk.com',
    logo: 'https://scamhawk.com/icon.svg',
    description:
      'Check crypto wallet addresses and websites for scam reports from the Chainabuse community.',
  };

  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ScamHawk',
    url: 'https://scamhawk.com',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    description:
      'Instantly check whether a crypto wallet address or website has been reported as a scam by the Chainabuse community.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: '4',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
      />
    </>
  );
}
