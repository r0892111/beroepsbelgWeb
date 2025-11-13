export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="prose prose-lg mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Privacy & Cookie Policy</h1>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Privacyverklaring</h2>
          <p className="leading-relaxed text-muted-foreground">
            BeroepsBelg respecteert uw privacy en gaat zorgvuldig om met uw persoonlijke gegevens. In deze
            privacyverklaring leggen we uit welke gegevens we verzamelen, waarom we dat doen en wat uw
            rechten zijn.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Welke gegevens verzamelen we?</h2>
          <p className="leading-relaxed text-muted-foreground">
            We verzamelen alleen gegevens die u zelf aan ons verstrekt, zoals:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground">
            <li>Naam en contactgegevens bij boekingen</li>
            <li>E-mailadres voor nieuwsbriefinschrijving</li>
            <li>Betalingsgegevens voor transacties</li>
            <li>Communicatie via contactformulieren</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Cookies</h2>
          <p className="leading-relaxed text-muted-foreground">
            Onze website gebruikt cookies om uw gebruikservaring te verbeteren. We gebruiken:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground">
            <li>Functionele cookies voor het functioneren van de website</li>
            <li>Analytische cookies om bezoekersstatistieken te verzamelen</li>
            <li>Marketing cookies voor gepersonaliseerde advertenties (alleen met toestemming)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Uw rechten</h2>
          <p className="leading-relaxed text-muted-foreground">
            U heeft het recht om uw persoonlijke gegevens in te zien, te corrigeren of te verwijderen.
            Neem contact met ons op via info@beroepsbelg.be voor vragen over uw privacy.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Contact</h2>
          <p className="leading-relaxed text-muted-foreground">
            Voor vragen over deze privacyverklaring kunt u contact opnemen via:
          </p>
          <p className="leading-relaxed text-muted-foreground">
            E-mail: info@beroepsbelg.be<br />
            Telefoon: +32 123 456 789
          </p>
        </section>
      </div>
    </div>
  );
}
