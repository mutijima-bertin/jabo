"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { localizedPath } from '@/lib/locale';
import type { Service, PortfolioItem } from '@/lib/api';
import { BookingForm } from '@/components/site/BookingForm';
import { WorkGrid } from './WorkGrid';
import { Services } from './Services';
import { Media } from './Media';
export function Studio({ founder, story }: { founder: string; story: string }) {  
const { locale } = useI18n(); const c = (en: string, rw: string) => locale === 'en' ? en : rw; return <section className="studio wrap" id="about">
    <div className="studio-image">
      <Media src={founder} alt="Nkurunziza Jabo" />
      <p className="small">NKURUNZIZA JABO / {c('FOUNDER & VIDEO JOURNALIST', 'UWASHINZE SITIDIYO N’UMUNYAMAKURU WA VIDEWO')}</p>
    </div>
    <div className="studio-copy">
      <p className="eyebrow">{c('THE PEOPLE BEHIND THE PICTURE', 'ABANTU BARI INYUMA Y’AMASHUSHO')}</p>
      <h2>{c('A studio with someone to talk to.', 'Sitidiyo ikwumva kandi igufasha.')}</h2>
      <p>{story || c('Creative Sound Studio brings photography, filmmaking and live production together in Kigali. Founded by video journalist Nkurunziza Jabo, the studio starts with people and the stories they have to share.', 'Creative Sound Studio ikorera i Kigali, igahuza gufotora, gukora filime no gutambutsa ibikorwa bya live. Yashinzwe na Nkurunziza Jabo, umunyamakuru wa videwo, ishingiye ku bantu n’inkuru zabo.')}</p>
      <Link className="text-link" href={localizedPath(locale, '/book')}>{c('Tell us what matters to you', 'Tubwire icyo wifuza')} ↗</Link>
      <p className="studio-note">{c('Listen closely. Look a little longer.', 'Tega amatwi. Itegereze witonze.')}</p>
    </div>
  </section>
}
export function Home({ services, projects, founder, story }: { services: Service[]; projects: PortfolioItem[]; founder: string; story: string }) {
  const { locale } = useI18n(); const c = (en: string, rw: string) => locale === 'en' ? en : rw; const [stage, setStage] = useState(0);
  const stages = [{ id: 'moment', name: c('The moment', 'Igihe'), title: c('First, pay attention.', 'Banza witegereze.'), text: c('The hands, the water, the shared effort. Notice what brings the scene together.', 'Amaboko, amazi n’imbaraga bahurije hamwe. Itegereze ibihuza iki gikorwa.') }, { id: 'decision', name: c('The decision', 'Guhitamo'), title: c('Choose what matters.', 'Hitamo icy’ingenzi.'), text: c('Move closer to the hands and the net. The same scene becomes a study of people working together.', 'Egera amaboko n’urushundura. Ubone neza abantu bakorera hamwe.') }, { id: 'image', name: c('The image', 'Ifoto'), title: c('Let the story breathe.', 'Erekana inkuru yose.'), text: c('Open the frame again. The people and their surroundings belong to one story.', 'Ongera werekane ifoto yose. Abantu n’aho bari bihuriye mu nkuru imwe.') }];
  return <>
    <section className="hero wrap" id="top">
      <div className="hero-copy">
        <p className="eyebrow">KIGALI, RWANDA / {c('PHOTOGRAPHY · FILM · LIVE', 'AMAFOTO · FILIME · LIVE')}</p>
        <h1>{c('Every story', 'Buri nkuru')}<br />{c('has a ', 'ifite ')}<span>{c('pulse.', 'ubuzima.')}</span>
        </h1>
        <p className="intro">{c('We bring it into focus.', 'Turabugaragaza.')}</p>
        <p className="hero-detail">{c("For organisations with a purpose.", "Ku bigo bifite intego.")}<br />{c("Brands with something to say.", "Ku birango bifite ubutumwa.")}<br />{c("Events that bring people together.", "Ku birori bihuza abantu.")}</p>
        <Link className="text-link" href="#portfolio">{c('Explore the work', 'Reba ibikorwa')} ↘</Link>
      </div>
      <figure className="hero-frame">
        <div className="founder-wrap">
          <Media src={founder} alt={c('Nkurunziza Jabo behind the camera', 'Nkurunziza Jabo ari gufata amashusho')} priority className="founder-media" />
          <span className="slice one" aria-hidden="true" />
          <span className="slice two" aria-hidden="true" />
          <span className="image-label">{c('BEHIND THE CAMERA / JABO', 'INYUMA YA KAMERA / JABO')}</span>
        </div>
        <figcaption>
          <span>{c('Real people. A personal point of view.', 'Abantu nyabo. Uburyo bwihariye bwo kubona inkuru.')}</span>
          <Link href="#about">{c('Meet the studio', 'Menya sitidiyo')} ↗</Link>
        </figcaption>
        <p className="paper-note">
          <small>{c('A STUDIO NOTE / 01', 'ICYITONDERWA / 01')}</small>{c('Start with people. Find the story.', 'Hera ku bantu. Menya inkuru.')}</p>
      </figure>
    </section>
    <section className="work-section" id="portfolio">
      <div className="wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / {c('SELECTED WORK', 'IBIKORWA BYATORANYIJWE')}</p>
            <h2>{c('Life happens. Make it matter.', 'Ibihe birahita. Bigire iby’agaciro.')}</h2>
          </div>
          <Link className="text-link" href={localizedPath(locale, '/portfolio')}>{c('Explore all work', 'Reba ibikorwa byose')} ↗</Link>
        </div>
        <WorkGrid items={projects} home />
      </div>
    </section>
    <section className="signal-section wrap" id="signal">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 / {c('INSIDE THE FRAME', 'MU IFOTO')}</p>
          <h2>{c('Look closer. There’s a story here.', 'Itegereze neza. Hano hari inkuru.')}</h2>
        </div>
        <p>{c('A moment. A decision. An image. Explore the way a frame can change what you see.', 'Igihe. Guhitamo. Ifoto. Reba uko uburyo bwo gufata ifoto buhindura ibyo ubona.')}</p>
      </div>
      <div className="signal-layout">
        <figure className="signal-figure">
          <div className="signal-image" data-stage={stages[stage].id}>
            <Media src="/studio/fieldwork-1440.webp" alt={c('People working together around a fishing net', 'Abantu bakorera hamwe ku rushundura rwo kuroba')} />
            <div className="signal-cuts" aria-hidden="true">
              <i />
              <i />
            </div>
            <span className="image-label">0{stage + 1} / {stages[stage].name}</span>
            <div className="frame-guide" aria-hidden="true" />
          </div>
          <figcaption>{c('A framing study from the studio archive.', 'Urugero rwo gutunganya ifoto yo mu bubiko bwa sitidiyo.')}</figcaption>
        </figure>
        <div className="signal-controls">
          <p className="eyebrow">{c('SOUND INTO IMAGE', 'IJWI RIHINDUKA ISHUSHO')}</p>
          <div className="stage-buttons" role="group" aria-label={c('Explore the frame', 'Reba ifoto')} >{stages.map((s, i) =>
            <button key={s.id} aria-pressed={i === stage} onClick={() => setStage(i)}>
              <span>0{i + 1}</span>{s.name}<b aria-hidden="true">↗</b>
            </button>)}</div>
          <div className="stage-copy" aria-live="polite" aria-atomic="true">
            <h3>{stages[stage].title}</h3>
            <p>{stages[stage].text}</p>
          </div>
          <p className="small quiet">{c('Explore at your own pace. No sound required.', 'Reba uko ubishaka. Nta jwi rikenewe.')}</p>
        </div>
      </div>
    </section>
    <section className="capabilities wrap" id="services">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / {c('WHAT WE DO', 'IBYO DUKORA')}</p>
          <h2>{c('One studio. Different ways to connect.', 'Sitidiyo imwe. Uburyo bwinshi bwo guhuza abantu.')}</h2>
        </div>
        <Link className="text-link" href={localizedPath(locale, '/services')}>{c('All services', 'Serivisi zose')} ↗</Link>
      </div>
      <Services services={services.slice(0, 3)} />
    </section>
    <Studio founder={founder} story={story} />
    <section className="process wrap">
      <p className="eyebrow">{c('FROM FIRST CONVERSATION TO FINAL FRAME', 'KUVA KU KIGANIRO CYA MBERE KUGEZA KU MASHUSHO YA NYUMA')}</p>
      <div className="process-grid">{[[c('LISTEN', 'TEGA AMATWI'), c('Find the intention.', 'Menya intego.'), c('Your audience, your purpose, your moment. Start with the questions that shape the work.', 'Abakumva, intego yawe n’igihe cyawe. Tangirira ku bibazo bigena umurimo.')], [c('MAKE', 'KORA'), c('Give it a form.', 'Ha igitekerezo ishusho.'), c('Agree the direction and scope, then bring the people, images and production together.', 'Mwemere ku cyerekezo n’ibizakorwa, hanyuma muhuze abantu, amashusho n’umurimo.')], [c('SHARE', 'SANGIZA'), c('Make it ready.', 'Tegura umusaruro.'), c('Review the work together and prepare the agreed final formats for the places it needs to live.', 'Murebere hamwe ibyakozwe, mutegure umusaruro wa nyuma aho uzakoreshwa.')]].map(([label, title, text], i) =>
        <article key={label}>
          <span>0{i + 1} / {label}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>)}</div>
    </section>
    <section className="enquiry-section" id="enquiry">
      <div className="wrap enquiry-layout">
        <div>
          <p className="eyebrow">{c('YOUR NEXT STORY', 'INKURU YAWE ITAHA')}</p>
          <h2>{c('What are you imagining?', 'Ni iki wifuza gukora?')}</h2>
          <p>{c('A clear idea, a rough thought, or an event on the horizon. Start where you are.', 'Igitekerezo gihamye, igitekerezo ukinoza, cyangwa ibirori utegura. Tangirira aho ugeze.')}</p>
          <p className="small enquiry-disclosure">{c('Send a project request. The studio will discuss scope and availability with you before confirming a booking.', 'Ohereza icyifuzo. Sitidiyo izaganira nawe ku bizakorwa no ku gihe mbere yo kwemeza umurimo.')}</p>
        </div>
        <div className="signal-booking">{services.length ? <BookingForm services={services} /> : <Link className="text-link" href={localizedPath(locale, '/contact')}>{c('Contact the studio', 'Vugana na sitidiyo')} ↗</Link>}</div>
      </div>
    </section>
  </>;
}
