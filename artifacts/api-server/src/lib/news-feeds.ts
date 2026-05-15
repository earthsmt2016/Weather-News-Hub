export interface NewsFeeds {
  feeds: { url: string; source: string }[];
  label: string;
}

export const bbcRegionMap: Record<string, { slug: string; label: string }> = {
  "west midlands": { slug: "england/birmingham_and_black_country", label: "Birmingham & West Midlands" },
  "england": { slug: "england", label: "England" },
  "wales": { slug: "wales", label: "Wales" },
  "scotland": { slug: "scotland", label: "Scotland" },
  "northern ireland": { slug: "northern_ireland", label: "Northern Ireland" },
  "greater london": { slug: "england/london", label: "London" },
  "london": { slug: "england/london", label: "London" },
  "greater manchester": { slug: "england/manchester", label: "Manchester" },
  "manchester": { slug: "england/manchester", label: "Manchester" },
  "merseyside": { slug: "england/merseyside", label: "Merseyside" },
  "south yorkshire": { slug: "england/south_yorkshire", label: "South Yorkshire" },
  "west yorkshire": { slug: "england/leeds_and_west_yorkshire", label: "West Yorkshire" },
  "north yorkshire": { slug: "england/york_and_north_yorkshire", label: "North Yorkshire" },
  "lancashire": { slug: "england/lancashire", label: "Lancashire" },
  "kent": { slug: "england/kent", label: "Kent" },
  "essex": { slug: "england/essex", label: "Essex" },
  "surrey": { slug: "england/surrey", label: "Surrey" },
  "sussex": { slug: "england/sussex", label: "Sussex" },
  "hampshire": { slug: "england/hampshire", label: "Hampshire" },
  "devon": { slug: "england/devon", label: "Devon" },
  "cornwall": { slug: "england/cornwall", label: "Cornwall" },
  "somerset": { slug: "england/somerset", label: "Somerset" },
  "dorset": { slug: "england/dorset", label: "Dorset" },
  "gloucestershire": { slug: "england/gloucestershire", label: "Gloucestershire" },
  "oxfordshire": { slug: "england/oxfordshire", label: "Oxfordshire" },
  "cambridgeshire": { slug: "england/cambridgeshire", label: "Cambridgeshire" },
  "norfolk": { slug: "england/norfolk", label: "Norfolk" },
  "suffolk": { slug: "england/suffolk", label: "Suffolk" },
  "derbyshire": { slug: "england/derbyshire", label: "Derbyshire" },
  "nottinghamshire": { slug: "england/nottingham", label: "Nottinghamshire" },
  "leicestershire": { slug: "england/leicester", label: "Leicestershire" },
  "lincolnshire": { slug: "england/lincolnshire", label: "Lincolnshire" },
  "northamptonshire": { slug: "england/northamptonshire", label: "Northamptonshire" },
  "staffordshire": { slug: "england/stoke_and_staffordshire", label: "Staffordshire" },
  "shropshire": { slug: "england/shropshire", label: "Shropshire" },
  "herefordshire": { slug: "england/hereford_and_worcester", label: "Herefordshire" },
  "worcestershire": { slug: "england/hereford_and_worcester", label: "Worcestershire" },
  "warwickshire": { slug: "england/coventry_and_warwickshire", label: "Warwickshire" },
  "coventry": { slug: "england/coventry_and_warwickshire", label: "Coventry & Warwickshire" },
  "cumbria": { slug: "england/cumbria", label: "Cumbria" },
  "tyne and wear": { slug: "england/tyne_and_wear", label: "Tyne & Wear" },
  "bristol": { slug: "england/bristol", label: "Bristol" },
  "berkshire": { slug: "england/berkshire", label: "Berkshire" },
  "wiltshire": { slug: "england/wiltshire", label: "Wiltshire" },
  "bedfordshire": { slug: "england/beds_bucks_and_herts", label: "Beds, Bucks & Herts" },
  "buckinghamshire": { slug: "england/beds_bucks_and_herts", label: "Beds, Bucks & Herts" },
  "hertfordshire": { slug: "england/beds_bucks_and_herts", label: "Beds, Bucks & Herts" },
};

export const countryGoogleParams: Record<string, { hl: string; gl: string; ceid: string }> = {
  "united kingdom": { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  "uk": { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  "italy": { hl: "it", gl: "IT", ceid: "IT:it" },
  "france": { hl: "fr", gl: "FR", ceid: "FR:fr" },
  "germany": { hl: "de", gl: "DE", ceid: "DE:de" },
  "spain": { hl: "es", gl: "ES", ceid: "ES:es" },
  "japan": { hl: "ja", gl: "JP", ceid: "JP:ja" },
  "australia": { hl: "en-AU", gl: "AU", ceid: "AU:en" },
  "canada": { hl: "en-CA", gl: "CA", ceid: "CA:en" },
  "india": { hl: "en-IN", gl: "IN", ceid: "IN:en" },
  "ireland": { hl: "en-IE", gl: "IE", ceid: "IE:en" },
  "new zealand": { hl: "en-NZ", gl: "NZ", ceid: "NZ:en" },
  "south africa": { hl: "en-ZA", gl: "ZA", ceid: "ZA:en" },
  "netherlands": { hl: "nl", gl: "NL", ceid: "NL:nl" },
  "united states": { hl: "en", gl: "US", ceid: "US:en" },
  "usa": { hl: "en", gl: "US", ceid: "US:en" },
};

export function getNewsFeeds(locationName: string, region: string, country: string): NewsFeeds {
  const nameLower = locationName.toLowerCase();
  const regionLower = region.toLowerCase();
  const countryLower = country.toLowerCase();

  const feeds: { url: string; source: string }[] = [];
  let label = locationName;

  const isUK = countryLower.includes("kingdom") || countryLower === "uk";

  if (isUK) {
    const regionParts = region.split(",").map(r => r.trim().toLowerCase()).filter(Boolean);
    const candidates = [nameLower, ...regionParts, regionLower];

    let bbcMatch: { slug: string; label: string } | null = null;
    for (const candidate of candidates) {
      const match = bbcRegionMap[candidate];
      if (match && match.slug !== "england") {
        bbcMatch = match;
        break;
      }
    }
    if (!bbcMatch) {
      for (const candidate of candidates) {
        if (bbcRegionMap[candidate]) {
          bbcMatch = bbcRegionMap[candidate];
          break;
        }
      }
    }

    if (bbcMatch) {
      feeds.push({ url: `https://feeds.bbci.co.uk/news/${bbcMatch.slug}/rss.xml`, source: `BBC ${bbcMatch.label}` });
      label = bbcMatch.label;
    }

    if (regionLower.includes("west midlands") || nameLower.includes("birmingham")) {
      feeds.push({ url: "https://www.birminghammail.co.uk/?service=rss", source: "Birmingham Live" });
      feeds.push({ url: "https://www.itv.com/news/central/feed.rss", source: "ITV News Central" });
    }
  }

  const googleQuery = encodeURIComponent(`${locationName} news`);
  const gp = countryGoogleParams[countryLower] || { hl: "en", gl: "US", ceid: "US:en" };

  feeds.push({
    url: `https://news.google.com/rss/search?q=${googleQuery}&hl=${gp.hl}&gl=${gp.gl}&ceid=${gp.ceid}`,
    source: "Google News",
  });

  return { feeds, label };
}
