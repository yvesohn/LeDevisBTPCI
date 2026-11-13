import Image from "next/image";

export default function SiteBanner() {
  return (
    <div className="site-banner" role="img" aria-label="DevisBTP CI — devis de construction en Côte d’Ivoire">
      <Image
        src="/devisbtp-banner.svg"
        alt="DevisBTP CI — devis de construction en Côte d’Ivoire"
        width={1200}
        height={260}
        priority
        className="site-banner__image"
      />
    </div>
  );
}
