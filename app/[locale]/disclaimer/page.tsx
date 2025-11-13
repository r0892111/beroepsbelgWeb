export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="prose prose-lg mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Algemene Voorwaarden</h1>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">1. Toepassingsgebied</h2>
          <p className="leading-relaxed text-muted-foreground">
            Deze algemene voorwaarden zijn van toepassing op alle diensten die worden aangeboden door
            BeroepsBelg, geregistreerd onder BE 0123.456.789.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">2. Boekingen</h2>
          <p className="leading-relaxed text-muted-foreground">
            Boekingen worden definitief na bevestiging en betaling. U ontvangt een bevestigingsmail met
            alle details van uw tour.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">3. Annulering</h2>
          <p className="leading-relaxed text-muted-foreground">
            U kunt tot 48 uur voor aanvang van de tour kosteloos annuleren. Bij annulering binnen 48 uur
            worden er annuleringskosten van 50% gerekend. Bij no-show wordt het volledige bedrag in
            rekening gebracht.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">4. Aansprakelijkheid</h2>
          <p className="leading-relaxed text-muted-foreground">
            BeroepsBelg kan niet aansprakelijk worden gesteld voor onvoorziene omstandigheden die leiden
            tot annulering of wijziging van de tour. In dergelijke gevallen zullen we ons best doen om een
            alternatief aan te bieden.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">5. Gedrag</h2>
          <p className="leading-relaxed text-muted-foreground">
            Deelnemers worden geacht zich respectvol te gedragen tegenover de gids en andere deelnemers.
            BeroepsBelg behoudt zich het recht voor om deelnemers bij ongepast gedrag te verwijderen
            zonder restitutie.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">6. Intellectueel eigendom</h2>
          <p className="leading-relaxed text-muted-foreground">
            Alle content op deze website, inclusief teksten, afbeeldingen en logo's, is eigendom van
            BeroepsBelg en wordt beschermd door auteursrecht.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">7. Toepasselijk recht</h2>
          <p className="leading-relaxed text-muted-foreground">
            Op deze algemene voorwaarden is Belgisch recht van toepassing. Geschillen worden voorgelegd aan
            de bevoegde rechtbank van Antwerpen.
          </p>
        </section>
      </div>
    </div>
  );
}
