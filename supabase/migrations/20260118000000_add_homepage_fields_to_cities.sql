-- Add homepage-specific tagline and description fields to cities table
-- These are separate from the teaser fields used on the tours page

ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_tagline_nl TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_tagline_en TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_tagline_fr TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_tagline_de TEXT;

ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_description_nl TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_description_en TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_description_fr TEXT;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS homepage_description_de TEXT;

-- Add comments for clarity
COMMENT ON COLUMN cities.homepage_tagline_nl IS 'Short tagline shown on homepage city wheel (Dutch)';
COMMENT ON COLUMN cities.homepage_tagline_en IS 'Short tagline shown on homepage city wheel (English)';
COMMENT ON COLUMN cities.homepage_tagline_fr IS 'Short tagline shown on homepage city wheel (French)';
COMMENT ON COLUMN cities.homepage_tagline_de IS 'Short tagline shown on homepage city wheel (German)';

COMMENT ON COLUMN cities.homepage_description_nl IS 'Description shown on homepage city wheel (Dutch)';
COMMENT ON COLUMN cities.homepage_description_en IS 'Description shown on homepage city wheel (English)';
COMMENT ON COLUMN cities.homepage_description_fr IS 'Description shown on homepage city wheel (French)';
COMMENT ON COLUMN cities.homepage_description_de IS 'Description shown on homepage city wheel (German)';

COMMENT ON COLUMN cities.teaser_nl IS 'Teaser text shown on tours page city cards (Dutch)';
COMMENT ON COLUMN cities.teaser_en IS 'Teaser text shown on tours page city cards (English)';
COMMENT ON COLUMN cities.teaser_fr IS 'Teaser text shown on tours page city cards (French)';
COMMENT ON COLUMN cities.teaser_de IS 'Teaser text shown on tours page city cards (German)';

-- Populate existing cities with homepage taglines and descriptions (from previous translation files)

-- Antwerpen
UPDATE cities SET
  homepage_tagline_nl = 'De Modehoofdstad',
  homepage_tagline_en = 'The Fashion Capital',
  homepage_tagline_fr = 'La Capitale de la Mode',
  homepage_tagline_de = 'Die Modehauptstadt',
  homepage_description_nl = 'Een metropool in zakformaat bekend om diamanten, avant-garde mode en de torenhoge spits van de kathedraal.',
  homepage_description_en = 'A pocket-sized metropolis known for diamonds, avant-garde fashion, and the cathedral''s soaring spire.',
  homepage_description_fr = 'Une métropole de poche connue pour ses diamants, sa mode avant-gardiste et la flèche imposante de sa cathédrale.',
  homepage_description_de = 'Eine Metropole im Taschenformat, bekannt für Diamanten, avantgardistische Mode und den hoch aufragenden Kirchturm der Kathedrale.'
WHERE slug = 'antwerpen';

-- Gent
UPDATE cities SET
  homepage_tagline_nl = 'De Eigenzinnige Rebel',
  homepage_tagline_en = 'The Quirky Rebel',
  homepage_tagline_fr = 'Le Rebelle Excentrique',
  homepage_tagline_de = 'Der Eigensinnige Rebell',
  homepage_description_nl = 'Geschiedenis met een rock ''n roll randje. Een bruisende studentenstad gecentreerd rond het imposante Gravensteen.',
  homepage_description_en = 'History with a rock ''n roll edge. A vibrant student city centered around the imposing Gravensteen castle.',
  homepage_description_fr = 'L''histoire avec un côté rock ''n roll. Une ville étudiante animée centrée autour de l''imposant château de Gravensteen.',
  homepage_description_de = 'Geschichte mit Rock ''n Roll. Eine lebendige Studentenstadt rund um die imposante Burg Gravensteen.'
WHERE slug = 'gent';

-- Brugge
UPDATE cities SET
  homepage_tagline_nl = 'Venetië van het Noorden',
  homepage_tagline_en = 'Venice of the North',
  homepage_tagline_fr = 'La Venise du Nord',
  homepage_tagline_de = 'Venedig des Nordens',
  homepage_description_nl = 'Een middeleeuws sprookje bewaard in de tijd. Kinderkopjes, zwanen op de grachten en romantisch mysterie.',
  homepage_description_en = 'A medieval fairytale preserved in time. Cobblestone streets, swans on the canals, and romantic mystery.',
  homepage_description_fr = 'Un conte de fées médiéval préservé dans le temps. Rues pavées, cygnes sur les canaux et mystère romantique.',
  homepage_description_de = 'Ein mittelalterliches Märchen, das in der Zeit bewahrt wurde. Kopfsteinpflasterstraßen, Schwäne auf den Kanälen und romantisches Mysterium.'
WHERE slug = 'brugge';

-- Brussel
UPDATE cities SET
  homepage_tagline_nl = 'Het Hart van Europa',
  homepage_tagline_en = 'The Heart of Europe',
  homepage_tagline_fr = 'Le Cœur de l''Europe',
  homepage_tagline_de = 'Das Herz Europas',
  homepage_description_nl = 'Surrealisme ontmoet bureaucratie. Pracht van de Grote Markt, Art Nouveau-juwelen en de beste chocolade ter wereld.',
  homepage_description_en = 'Surrealism meets bureaucracy. Grand Place splendor, Art Nouveau gems, and the best chocolate in the world.',
  homepage_description_fr = 'Le surréalisme rencontre la bureaucratie. Splendeur de la Grand-Place, joyaux Art Nouveau et le meilleur chocolat du monde.',
  homepage_description_de = 'Surrealismus trifft Bürokratie. Pracht des Grand Place, Jugendstil-Juwelen und die beste Schokolade der Welt.'
WHERE slug = 'brussel';

-- Leuven
UPDATE cities SET
  homepage_tagline_nl = 'De Hersenen & Het Bier',
  homepage_tagline_en = 'The Brains & The Beer',
  homepage_tagline_fr = 'Les Cerveaux & La Bière',
  homepage_tagline_de = 'Die Gehirne & Das Bier',
  homepage_description_nl = 'Thuisbasis van de oudste universiteit van de Lage Landen en het hoofdkwartier van ''s werelds grootste brouwerij.',
  homepage_description_en = 'Home to the oldest university in the Low Countries and the headquarters of the world''s largest brewery.',
  homepage_description_fr = 'Siège de la plus ancienne université des Pays-Bas et du siège de la plus grande brasserie du monde.',
  homepage_description_de = 'Heimat der ältesten Universität der Niederlande und des Hauptsitzes der weltgrößten Brauerei.'
WHERE slug = 'leuven';

-- Knokke-Heist
UPDATE cities SET
  homepage_tagline_nl = 'De Gouden Driehoek',
  homepage_tagline_en = 'The Golden Triangle',
  homepage_tagline_fr = 'Le Triangle d''Or',
  homepage_tagline_de = 'Das Goldene Dreieck',
  homepage_description_nl = 'Luxe aan zee. High-end boetiekjes, kunstgalerijen en het Zwin natuurreservaat maken het de verfijnde kustkeuze.',
  homepage_description_en = 'Luxury by the sea. High-end boutiques, art galleries, and the Zwin nature reserve make it the sophisticated coast choice.',
  homepage_description_fr = 'Luxe en bord de mer. Boutiques haut de gamme, galeries d''art et la réserve naturelle du Zwin en font le choix côtier sophistiqué.',
  homepage_description_de = 'Luxus am Meer. Edle Boutiquen, Kunstgalerien und das Zwin-Naturreservat machen es zur raffinierten Küstenwahl.'
WHERE slug = 'knokke-heist';

-- Mechelen
UPDATE cities SET
  homepage_tagline_nl = 'De Verborgen Parel',
  homepage_tagline_en = 'The Hidden Gem',
  homepage_tagline_fr = 'La Perle Cachée',
  homepage_tagline_de = 'Die Verborgene Perle',
  homepage_description_nl = 'Een stad van beiaarden en stilte. Wandel over het drijvende pad op de Dijle en beklim de toren van Sint-Rombout.',
  homepage_description_en = 'A city of carillons and silence. Walk the floating path on the Dyle and climb St. Rumbold''s tower.',
  homepage_description_fr = 'Une ville de carillons et de silence. Marchez sur le chemin flottant de la Dyle et grimpez la tour Saint-Rombaut.',
  homepage_description_de = 'Eine Stadt der Glockenspiele und Stille. Gehen Sie auf dem schwimmenden Pfad an der Dijle entlang und besteigen Sie den St.-Rombouts-Turm.'
WHERE slug = 'mechelen';

-- Hasselt
UPDATE cities SET
  homepage_tagline_nl = 'De Hoofdstad van de Smaak',
  homepage_tagline_en = 'The Capital of Taste',
  homepage_tagline_fr = 'La Capitale du Goût',
  homepage_tagline_de = 'Die Hauptstadt des Geschmacks',
  homepage_description_nl = 'Bekend om jenevergin, mode en als de meest gastvrije stad. Een plek waar goede smaak een levensstijl is.',
  homepage_description_en = 'Known for jenever gin, fashion, and being the most welcoming city. A place where good taste is a lifestyle.',
  homepage_description_fr = 'Connue pour le genièvre, la mode et comme la ville la plus accueillante. Un endroit où le bon goût est un mode de vie.',
  homepage_description_de = 'Bekannt für Wacholder-Gin, Mode und als die gastfreundlichste Stadt. Ein Ort, an dem guter Geschmack ein Lebensstil ist.'
WHERE slug = 'hasselt';

-- Spa
UPDATE cities SET
  homepage_tagline_nl = 'De Parel van de Ardennen',
  homepage_tagline_en = 'The Pearl of the Ardennes',
  homepage_tagline_fr = 'La Perle des Ardennes',
  homepage_tagline_de = 'Die Perle der Ardennen',
  homepage_description_nl = 'Het originele kuuroord. Beroemd om zijn genezende thermale waters, het casino en weelderige groene omgeving.',
  homepage_description_en = 'The original spa town. Famous for its healing thermal waters, the casino, and lush green surroundings.',
  homepage_description_fr = 'La ville thermale originale. Célèbre pour ses eaux thermales curatives, le casino et son environnement verdoyant.',
  homepage_description_de = 'Die ursprüngliche Kurstadt. Berühmt für ihre heilenden Thermalwasser, das Casino und die üppige grüne Umgebung.'
WHERE slug = 'spa';
