import { ExternalLink, FileWarning, Globe, PhoneCall, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { type Contacts, useApi } from "../api";
import { Async, Card, DataTable, inputClass, Notice, PageHeader, SectionTitle, SourceLine } from "../components/ui";

const PORTAL = "https://cybercrime.gov.in/";

const STEPS = [
  { title: "Call 1930 immediately", text: "This is the national helpline for cyber financial fraud. Reporting quickly gives the system the best chance of holding the money before it moves on." },
  { title: "Contact your bank", text: "Use the number on your card or the bank's official website. Ask it to block the card, UPI or account, and note the reference number." },
  { title: "File on cybercrime.gov.in", text: "Choose the financial fraud option if money was lost. You can also report other cybercrimes here, including crimes against women and children." },
  { title: "Keep the acknowledgement", text: "Note the complaint or acknowledgement number. You will need it to track the complaint and when talking to your bank or the police." },
  { title: "Follow up", text: "Track the complaint on the portal and respond to genuine police requests. Visit your local police or cyber police station if you are advised to." },
];

const EVIDENCE = [
  "Transaction ID or UTR number, date, time and amount",
  "Your bank account or UPI ID, and the account or UPI ID the money went to",
  "Screenshots of messages, chats, payment screens and profiles",
  "Phone numbers, email addresses, website links and app names",
  "Original SMS and emails. Don't delete them, because details in the originals matter",
  "Bank statement showing the debit",
];

const FOLLOW_UP = [
  "'Recovery agents' who promise to get your money back for a fee are scammers",
  "Police and banks will not ask you to pay to release a refund, or to pay a 'processing charge'",
  "Don't share your OTP, PIN or screen with anyone who calls about your complaint",
  "Don't search the web for 'helpline' numbers. Use only the official sources on this page",
  "Criminals may reuse your details, so treat unexpected calls about your case with suspicion",
];

const RESOURCES = [
  { title: "National Cyber Crime Reporting Portal", org: "Ministry of Home Affairs", text: "Report all types of cybercrime and track complaints.", href: PORTAL },
  { title: "Chakshu: report suspected fraud communication", org: "Department of Telecommunications, Sanchar Saathi", text: "Report suspected fraud calls, SMS or WhatsApp messages. Chakshu is not for reporting money already lost. Use 1930 for that.", href: "https://sancharsaathi.gov.in/sfc/" },
  { title: "Know mobile connections in your name", org: "Department of Telecommunications, Sanchar Saathi", text: "See mobile connections registered in your name and report those you did not take.", href: "https://tafcop.sancharsaathi.gov.in/" },
  { title: "Block a lost or stolen handset", org: "Department of Telecommunications, Sanchar Saathi", text: "Block a lost or stolen phone across Indian networks.", href: "https://sancharsaathi.gov.in/Home/ceir-services.jsp" },
  { title: "RBI complaint portal", org: "Reserve Bank of India", text: "Escalate a complaint against a regulated bank or financial entity under the Integrated Ombudsman Scheme. Contact centre: 14448.", href: "https://cms.rbi.org.in/" },
  { title: "RBI: 'digital arrest' is a scam", org: "Reserve Bank of India", text: "RBI's public awareness page on digital arrest scams.", href: "https://rbikehtahai.rbi.org.in/rbi-digital-arrest.html" },
  { title: "CERT-In incident response", org: "Ministry of Electronics and IT", text: "National agency for cyber security incidents, mainly for organisations. Toll-free +91-1800-11-4949, email incident@cert-in.org.in.", href: "https://www.cert-in.org.in/s2cMainServlet?pageid=CONTACTUS" },
];

export default function EmergencyPage() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Emergency help" title="If you have been defrauded or targeted online">
        Act quickly and use only official channels. This portal is a student project and cannot take complaints.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-bad/50 bg-gradient-to-br from-bad/20 to-card p-5 sm:p-6" aria-labelledby="helpline">
          <p id="helpline" className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={16} className="text-bad" aria-hidden /> National cyber crime helpline</p>
          <a href="tel:1930" className="num mt-1 block text-6xl font-bold tracking-tight hover:text-accent">1930</a>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            The portal states that any victim of financial cyber fraud can dial 1930. It is toll-free and also helps with lodging an online complaint. If you have just lost money, call now.
          </p>
          <a href="tel:1930" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bad px-4 py-2.5 text-sm font-semibold text-white hover:bg-bad/85">
            <PhoneCall size={16} aria-hidden /> Call 1930
          </a>
        </section>
        <section className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-card p-5 sm:p-6" aria-labelledby="portal">
          <p id="portal" className="flex items-center gap-2 text-sm font-semibold"><Globe size={16} className="text-accent" aria-hidden /> Official reporting portal</p>
          <a href={PORTAL} target="_blank" rel="noreferrer" className="mt-2 block break-words text-2xl font-bold tracking-tight hover:text-accent sm:text-3xl">cybercrime.gov.in</a>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            The National Cyber Crime Reporting Portal of the Ministry of Home Affairs, for all types of cybercrime.
          </p>
          <a href={PORTAL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent/85">
            Open the official portal <ExternalLink size={14} aria-hidden />
          </a>
        </section>
      </div>
      <div className="mt-4">
        <Notice tone="warn" title="In immediate physical danger?">Call 112, India's emergency response number, or your local police.</Notice>
      </div>

      <SectionTitle title="What to do, in order" />
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card className="h-full">
              <span className="num inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{i + 1}</span>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.text}</p>
            </Card>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><FileWarning size={16} className="text-warn" aria-hidden /> Evidence to preserve</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">{EVIDENCE.map((e) => <li key={e}>{e}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><ShieldAlert size={16} className="text-bad" aria-hidden /> Avoid follow-up scams</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">{FOLLOW_UP.map((e) => <li key={e}>{e}</li>)}</ul>
        </Card>
      </div>

      <SectionTitle title="Official resources" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {RESOURCES.map((r) => (
          <Card key={r.href} className="flex flex-col">
            <h3 className="text-sm font-semibold">{r.title}</h3>
            <p className="mt-0.5 text-xs text-ink-3">{r.org}</p>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-2">{r.text}</p>
            <a className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline" href={r.href} target="_blank" rel="noreferrer">
              Open <ExternalLink size={12} aria-hidden />
            </a>
          </Card>
        ))}
      </div>

      <StateContacts />
    </div>
  );
}

function StateContacts() {
  const state = useApi<Contacts>("/api/contacts");
  const [query, setQuery] = useState("");
  return (
    <>
      <SectionTitle title="State and UT cyber police contacts">
        For following up a complaint you have already registered on the portal. For new financial fraud, call 1930 first.
      </SectionTitle>
      <Async state={state} height={280}>
        {(data) => {
          const q = query.trim().toLowerCase();
          const rows = data.contacts.filter((c) => c.state_name.toLowerCase().includes(q));
          return (
            <Card>
              <p className="mb-3 text-sm leading-relaxed text-ink-2">{data.note}</p>
              <div className="mb-3 max-w-xs">
                <label htmlFor="contact-search" className="mb-1 block text-xs font-medium text-ink-2">Find your State or UT</label>
                <input id="contact-search" className={inputClass} placeholder="e.g. Kerala" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              {rows.length ? (
                <DataTable
                  caption="State and UT cyber police contacts" rows={rows} maxHeight="420px"
                  columns={[
                    { label: "State/UT", align: "left", render: (c) => c.state_name },
                    { label: "Office email", align: "left", render: (c) => <a className="break-all text-accent hover:underline" href={`mailto:${c.email}`}>{c.email}</a> },
                    { label: "Phone", align: "left", render: (c) => (c.phone ? <span className="num whitespace-nowrap">{c.phone}</span> : <span className="text-ink-3">Not listed</span>) },
                  ]}
                />
              ) : <p className="text-sm text-ink-2">No State or UT matches that search.</p>}
              <SourceLine source={data.source} extra="Shown exactly as published on 7 November 2026, without officers' names. Details change, so check the official page if a contact does not respond." />
            </Card>
          );
        }}
      </Async>
    </>
  );
}
