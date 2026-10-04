import Image from "next/image";
import Link from "next/link";
import { techniques as energyTechniques } from "@/features/knowledge-base/catalogue";
import { techniques as resilienceTechniques } from "@/features/resilience/catalogue";
import styles from "./landing-discovery.module.css";

const journey = [
  { title: "Tell us about your room", detail: "Start with your windows, shade and what makes the room uncomfortable. Watch your room take shape in 3D as you answer." },
  { title: "Understand your options", detail: "See what may be letting heat in, explore practical changes, and review cooling costs when the right information is available." },
  { title: "Make one change count", detail: "Choose a next step, save a checklist and set a check-in. Come back to record what you tried, what you spent and how the room feels." },
];

const questions = [
  { title: "Where should I start?", answer: "If a bedroom feels too hot, start with the room assessment. If you want to understand your household electricity bill, open the Energy Assistant. You can also browse Simple techniques or Home resilience without completing an assessment." },
  { title: "Do I need an account or an electricity bill?", answer: "Neither is needed for the room assessment or the guides. Your room journey saves in the same browser. An optional account lets you save it across devices and use Rewards. A bill is only needed for bill analysis in the Energy Assistant." },
  { title: "Will it tell me exactly how much I’ll save?", answer: "It shows costs when the necessary inputs are available and explains the assumptions behind comparisons. The window-shading explorer is a what-if scenario, not a promise of personal savings. Missing information stays unknown, and a whole-home bill cannot establish your bedroom’s cooling use." },
  { title: "What happens when I upload a bill?", answer: "The Energy Assistant reads a text-based PDF and lets you review the details before continuing. Extracted bill text is sent to OpenAI for analysis. The app does not intentionally save your PDF or bill text; provider processing and retention policies apply. Use a redacted bill where possible." },
  { title: "Who is the guidance for?", answer: "The room assessment starts with one bedroom in Greater Sydney. Our broader guides draw on Australian official sources for everyday energy use and home preparation. Suitability depends on your home and local conditions; follow local warnings during an emergency and get qualified advice for building work." },
];

export function LandingDiscovery() {
  return <div className={styles.wrapper}>
    <section id="how-it-works" className={styles.journey} aria-labelledby="journey-title">
      <div className={styles.sectionHeading}>
        <div><span className={styles.eyebrow}>FROM UNDERSTANDING TO ACTION</span><h2 id="journey-title">One room. A clear next step.</h2></div>
        <p>You don’t need to know every building detail. Start with what you know, and leave the rest as “not sure”.</p>
      </div>
      <ol className={styles.journeySteps}>{journey.map((step, index) => <li key={step.title}>
        <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
        <h3>{step.title}</h3><p>{step.detail}</p>
      </li>)}</ol>
      <Link className={styles.textLink} href="/assessment">Let’s explore my room <span aria-hidden="true">→</span></Link>
    </section>

    <section className={styles.tools} aria-labelledby="tools-title">
      <div className={styles.sectionHeading}>
        <div><span className={styles.eyebrow}>A LITTLE CLARITY GOES A LONG WAY</span><h2 id="tools-title">Understand more.<br />Know what to do next.</h2></div>
        <p>Go from a room that feels too hot or a bill that’s hard to read to a practical next step for your home.</p>
      </div>
      <div className={styles.featureGrid}>
        <article className={styles.assistant}>
          <div className={styles.featureCopy}>
            <span className={styles.eyebrow}>ENERGY ASSISTANT</span>
            <h3>Your electricity bill,<br />in everyday language.</h3>
            <p>Bring an energy question or upload a recent PDF bill. Check the details together and talk through how your household uses energy.</p>
            <ul className={styles.checkList}>
              <li>Review usage, rates and charges.</li>
              <li>Add the context only you know about your home.</li>
              <li>Explore practical ways to reduce unnecessary use.</li>
            </ul>
            <Link className={styles.featureLink} href="/energy-assistant">Meet your Energy Assistant <span aria-hidden="true">↗</span></Link>
          </div>
          <div className={styles.billPreview} aria-hidden="true">
            <div className={styles.billTop}><FeatureIcon kind="bill" /><span>A clearer picture</span></div>
            <h4>What’s behind the bill?</h4>
            <div className={styles.billLine}><span>Usage</span><strong>Energy your household used</strong></div>
            <div className={styles.billLine}><span>Rates</span><strong>What you pay per unit</strong></div>
            <div className={styles.billLine}><span>Next steps</span><strong>Changes worth exploring</strong></div>
            <p>Your bill. Your context. A useful conversation.</p>
          </div>
        </article>
        <article className={styles.planFeature}>
          <div className={styles.featurePhoto}><Image src="/images/techniques/check-insulation.png" alt="Illustration of two people discussing a home's construction" fill sizes="(max-width: 900px) 90vw, 650px" /></div>
          <div className={styles.featureCopy}>
            <span className={styles.eyebrow}>YOUR ROOM PLAN</span>
            <h3>A good idea is just the beginning.</h3>
            <p>Turn a suitable recommendation into a checklist. Keep your assumptions alongside your plan, choose a check-in date and return to see what changed.</p>
            <ul className={styles.checkList}>
              <li>Start with one manageable action.</li>
              <li>Record progress, spending and comfort.</li>
              <li>Revisit your options when plans change.</li>
            </ul>
            <Link className={styles.featureLink} href="/assessment">Build my room plan <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
      </div>
    </section>

    <section className={styles.guides} aria-labelledby="guides-title">
      <div className={styles.sectionHeading}>
        <div><span className={styles.eyebrow}>START WITH WHAT YOU HAVE</span><h2 id="guides-title">Small changes for everyday life.<br />Preparation for the unexpected.</h2></div>
        <p>Practical guides with clear steps, things to check and links to the Australian official guidance behind them.</p>
      </div>
      <div className={styles.guideGrid}>
        <article className={styles.guide}>
          <div className={styles.guidePhoto}><Image src="/images/techniques/close-curtains.png" alt="Illustration of curtains shading a bedroom from sunlight" fill sizes="(max-width: 650px) 90vw, 700px" /></div>
          <div className={styles.guideCopy}>
            <span className={styles.eyebrow}>{energyTechniques.length} IDEAS · SIMPLE TECHNIQUES</span>
            <h3>A more comfortable home can start small.</h3>
            <p>From closing curtains at the right time to checking insulation, find habits and improvements that fit your room and the rest of your home.</p>
            <div className={styles.topicTags}><span>Keep heat out</span><span>Cool efficiently</span><span>Everyday energy</span></div>
            <Link className={styles.featureLink} href="/knowledge-base">Find a small change <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
        <article className={styles.guide}>
          <div className={styles.guidePhoto}><Image src="/images/techniques/external-shade.png" alt="Illustration of a home with adjustable external window shading" fill sizes="(max-width: 650px) 90vw, 700px" /></div>
          <div className={styles.guideCopy}>
            <span className={styles.eyebrow}>{resilienceTechniques.length} GUIDES · HOME RESILIENCE</span>
            <h3>A little preparation before conditions change.</h3>
            <p>Explore household plans, useful maintenance and improvements to discuss with a professional, across five areas of home resilience.</p>
            <div className={styles.topicTags}><span>Heatwaves</span><span>Floods</span><span>Storms</span><span>Bushfires</span><span>Earthquakes</span></div>
            <Link className={styles.featureLink} href="/explore">Explore home resilience <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
      </div>
    </section>

    <section className={styles.impact} aria-labelledby="impact-title">
      <div className={styles.impactCopy}>
        <span className={styles.eyebrow}>COMFORT AT HOME. CARE FOR THE CLIMATE.</span>
        <h2 id="impact-title">Start with the room.<br />Think beyond the bill.</h2>
        <p>Keeping unwanted heat out can reduce the cooling your home needs. Using less electricity can also reduce associated emissions, depending on how that electricity is supplied.</p>
        <a className={styles.textLink} href="https://www.yourhome.gov.au/live-adapt/zero-carbon" target="_blank" rel="noopener noreferrer">Why energy use matters <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <div className={styles.impactSteps}>
        <div><span aria-hidden="true">01</span><div><h3>Reduce the need for cooling</h3><p>Investigate shade, insulation and suitable ventilation before deciding on equipment changes.</p></div></div>
        <div><span aria-hidden="true">02</span><div><h3>Make energy use visible</h3><p>Understand your usage and explore costs with clear inputs and assumptions.</p></div></div>
        <div><span aria-hidden="true">03</span><div><h3>Build habits that last</h3><p>Choose a practical action, follow through and review what worked for your household.</p></div></div>
      </div>
    </section>

    <section className={styles.rewards} aria-labelledby="rewards-title">
      <div className={styles.rewardMark}><FeatureIcon kind="leaf" /></div>
      <div className={styles.rewardCopy}>
        <span className={styles.eyebrow}>A LITTLE ENCOURAGEMENT TO FOLLOW THROUGH</span>
        <h2 id="rewards-title">Put your next step into action.</h2>
        <p>Sign in, complete an eligible recommended task and submit photos for review. Approved tasks earn coins you can explore in the rewards marketplace.</p>
        <small>Prototype coins have no cash value. Marketplace coupons are demos, not retailer discounts.</small>
      </div>
      <Link className={styles.rewardLink} href="/rewards">Discover Rewards <span aria-hidden="true">↗</span></Link>
    </section>

    <section id="help" className={styles.faq} aria-labelledby="questions-title">
      <div className={styles.sectionHeading}>
        <div><span className={styles.eyebrow}>BEFORE YOU BEGIN</span><h2 id="questions-title">A few things you<br />might be wondering.</h2></div>
        <p>A clear starting point, with room for what you don’t know yet.</p>
      </div>
      <div className={styles.questions}>{questions.map(question => <details key={question.title}>
        <summary>{question.title}<span aria-hidden="true">＋</span></summary><p>{question.answer}</p>
      </details>)}</div>
    </section>

    <section className={styles.closing} aria-labelledby="start-title">
      <div><span className={styles.eyebrow}>YOUR NEXT STEP STARTS AT HOME</span><h2 id="start-title">Let’s make your room<br />a better place to be.</h2><p>Start with one bedroom. Find one useful change.</p></div>
      <div className={styles.closingActions}><Link className={styles.primaryLink} href="/assessment">Start my assessment <span aria-hidden="true">→</span></Link><Link className={styles.textLink} href="/knowledge-base">Just browsing? Explore the guides <span aria-hidden="true">↗</span></Link></div>
    </section>
    <footer className={styles.footer}><span>Home Heat Planner</span><small>Thoughtful about comfort. Practical about energy.</small></footer>
  </div>;
}

function FeatureIcon({ kind }: { kind: "bill" | "leaf" }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "bill" ? <><path d="M12 5h18l7 7v31l-6-3-7 3-6-3-6 3V5Z" /><path d="M29 5v9h8M19 21h11M19 27h11M19 33h6" /></> : <><circle cx="24" cy="24" r="20" /><path d="M14 31C10 17 26 20 33 11c3 16-3 26-17 23M13 36l15-17M18 29l1-7m5 1 6-1" /></>}
  </svg>;
}
