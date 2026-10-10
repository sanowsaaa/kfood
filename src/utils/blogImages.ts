import photo01 from '@/assets/blog/k-food-01.webp';
import photo02 from '@/assets/blog/k-food-02.webp';
import photo03 from '@/assets/blog/k-food-03.webp';
import photo04 from '@/assets/blog/k-food-04.webp';
import photo05 from '@/assets/blog/k-food-05.webp';
import photo06 from '@/assets/blog/k-food-06.webp';
import photo07 from '@/assets/blog/k-food-07.webp';
import photo08 from '@/assets/blog/k-food-08.webp';
import photo09 from '@/assets/blog/k-food-09.webp';
import photo10 from '@/assets/blog/k-food-10.webp';

// Owner-supplied replacements for the 32 existing generated article covers.
// Ship images with the app so an unpublished build never points live articles
// at files that do not exist yet. Later manual cover edits remain authoritative.
const covers: Record<string, string> = {
  'top-10-koreiska-hrana': photo04,
  'aziatska-hrana-balgariya-narachnik': photo01,
  'ekskurziya-veliko-tarnovo-patevodit': photo08,
  'kakvo-da-pravya-veliko-tarnovo': photo05,
  'kakvo-ima-za-pravene-veliko-tarnovo': photo02,
  'interesni-mesta-veliko-tarnovo': photo09,
  'nai-lyutite-ramen-v-sveta': photo06,
  'koreiska-hrana-zdrave-kimchi-superhrana': photo03,
  'kak-da-prigotviash-koreisko-ramen': photo10,
  'veliko-tarnovo-koreiska-kultura': photo07,
  'koreiska-snakove-narachnik': photo04,
  'koreiska-sosove-gochujang-doenjang': photo01,
  'kpop-koreiska-hrana-hallyu-balgariya': photo08,
  'veliko-tarnovo-restoranty-narachnik-2024': photo05,
  'samyang-buldak-narachnik-ognenoto-pile': photo02,
  'koreiska-napitki-soju-chai': photo09,
  'kak-da-stignesh-do-veliko-tarnovo': photo06,
  'koreiska-kuhnya-vegetarianci-vegani': photo03,
  'koreiska-nova-godina-seollal-tradicii': photo10,
  'koreiska-hrana-vs-kitaiska-yaponska-sravnenie': photo07,
  'kpop-fenomen-balgariya-korejska-muzika': photo04,
  'kdrama-narachnik-top-10-koreijski-seriali': photo01,
  'koreijski-tradicii-obichai-narachnik': photo08,
  'kak-da-prigotvis-kimchi-u-doma-recept': photo05,
  'koreijsko-bbq-u-doma-organiziraj-vecherya': photo02,
  'imashnujnoto-tavora-digital-marketing-veliko-tarnovo-seo': photo09,
  'koreiska-hrana-balgariya-palen-narachnik-2026': photo06,
  'korejska-hrana-na-edro-bulgaria': photo03,
  'kak-da-otvorish-korejski-restorant-bulgaria': photo10,
  'korejska-hrana-na-edro-evropejski-dostavchitsi': photo07,
  'kak-digitalen-marketing-udvoi-klienti-k-food': photo04,
  'zashto-vseki-biznes-investira-digitalen-marketing-2026': photo01,
};

export function withBlogCover<T extends { slug: string; cover_image: string }>(post: T): T {
  const replacement = covers[post.slug];
  if (!replacement || !post.cover_image?.startsWith('https://readdy.ai/api/search-image?')) return post;
  return { ...post, cover_image: replacement };
}
