import React from 'react';
import {
  DiagramContext,
  DiagramQuestions,
  DiagramTurn,
  DiagramEdits,
  DiagramImages,
} from './EmailDocDiagrams.jsx';

// Static documentation for the Email Marketing Agent. No data fetching, no props
// from the wire — this is a written page, kept in sync by hand with the
// workflow's prompts and graph. Built the same way as MetaAdAgentDoc.jsx and
// using only the `.doc-*` classes that page already uses, so the print
// stylesheet and the Word export need nothing new.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// EmailDocDiagrams.jsx rather than in another paragraph here.

// No `updated` date, for the same reason as the Meta Ad page: a stamp is only as
// true as the last person to remember it, and a stale one is worse than none.
export const EMAIL_DOC_META = {
  title: 'Email Marketing Agent',
  subtitle: 'How it plans a campaign, what it asks you, and how the copy and the design get made.',
};

function Section({ num, title, intro, children }) {
  return (
    <section className="doc-section">
      <div className="doc-sec-head">
        <span className="doc-sec-num">{num}</span>
        <div>
          <h2>{title}</h2>
          {intro}
        </div>
      </div>
      {children}
    </section>
  );
}

function Figure({ children, caption }) {
  return (
    <figure className="doc-fig">
      <div className="doc-scroller">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Panel({ num, title, owns, lede, children }) {
  return (
    <article className="doc-panel">
      <header>
        <span className="doc-panel-num">{num}</span>
        <h3>{title}</h3>
        <span className="doc-panel-owns">{owns}</span>
      </header>
      <div className="doc-panel-body">
        <div className="doc-panel-lede">{lede}</div>
        <div className="doc-panel-know">{children}</div>
      </div>
    </article>
  );
}

function Bench({ rows }) {
  return (
    <dl className="doc-bench">
      {rows.map(([term, def]) => (
        <React.Fragment key={term}>
          <dt>{term}</dt>
          <dd>{def}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function EmailAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what goes in, what comes out ===================== */}
      <Section
        num="01"
        title="What goes in, and what comes out"
        intro={
          <>
            <p>
              Five things go in; one finished email — or a sequence of them — comes out, across three
              tabs. The agent never sends anything. What you get is an email built to be loaded into
              your own sending tool, with the details only that tool can know — the reader&rsquo;s
              first name, where each button leads, the unsubscribe link — left as named fill-in
              fields.
            </p>
            <p>
              A session starts from your Company Blueprint, or from a PDF of one with{' '}
              <em>Brand Bible</em> and <em>Buyer Personas</em> as its two headings. Starting from a
              PDF means there are no homepage pictures to work from, so the email leans on your own
              uploads, or on type and colour.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>Your Blueprint is copied in when the session starts.</b> Editing the Blueprint later
              changes the next session, not one already running. And if the Blueprint has no record
              of how your site looks, the agent reads your homepage once at the start and saves what
              it finds back to the Blueprint, so every later session has it too.
            </>
          }
        >
          <DiagramContext />
        </Figure>
      </Section>

      {/* ===================== 02 — the opening questions ===================== */}
      <Section
        num="02"
        title="The questions it asks once"
        intro={
          <p>
            Before anything is written, the agent reads your Blueprint and your homepage&rsquo;s
            pictures, then asks only what none of them could settle: what this campaign is for, how
            you want it to turn out, and the facts about this particular send that only you hold.
            Each comes with suggested answers drawn from your own brand, so you&rsquo;re mostly
            picking rather than writing.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramQuestions />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>How it writes them</h3>
            <dl>
              <dt>Bundles what travels together</dt>
              <dd>
                The occasion, the audience and the urgency are one situation in real life, so
                they&rsquo;re one question — and one answer settles all three.
              </dd>
              <dt>Offers situations, not jargon</dt>
              <dd>
                &ldquo;Winning back people who&rsquo;ve gone quiet since autumn&rdquo; rather than
                &ldquo;re-engagement, lapsed segment, moderate urgency&rdquo;. You pick by recognising
                your own circumstances, not by decoding marketing vocabulary.
              </dd>
              <dt>Uses your real names</dt>
              <dd>
                The options name your actual products, personas and seasonal moments. A filler option
                that would fit any brand — &ldquo;Other&rdquo;, &ldquo;Brand awareness&rdquo;,
                &ldquo;Not sure&rdquo; — is not allowed.
              </dd>
              <dt>Takes several answers where they&rsquo;re independent</dt>
              <dd>
                &ldquo;What can we point to as proof? Pick any that apply&rdquo; — because you might
                have reviews <em>and</em> real numbers.
              </dd>
              <dt>Leaves the box empty when a list would be invented</dt>
              <dd>The discount code or the launch date are yours to type, not to choose.</dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>What it won&rsquo;t ask</h3>
            <dl>
              <dt>Anything your Blueprint answers</dt>
              <dd>
                Your voice, your mission, your personas, your colours. A standing rule in your brand
                bible — say, no discounting — retires the question about it.
              </dd>
              <dt>Anything about the business</dt>
              <dd>Revenue, margins, team, budget, tools or channel strategy. Only this campaign.</dd>
              <dt>Which product, if you sell one</dt>
              <dd>A single-product brand is never asked which product the email is about.</dd>
              <dt>Anything it can look up</dt>
              <dd>
                A seasonal moment or what the category is doing right now — it searches the web for
                that and writes sharper options from it.
              </dd>
              <dt>Anything as if it were required</dt>
              <dd>Every answer is optional. Skip one and the strategist decides it instead.</dd>
            </dl>
          </div>
        </div>

        <div className="doc-note">
          <p>
            <strong>If your homepage gave it nothing usable</strong> — only interface icons, a QR
            code, a few video stills — it treats that the same as having no pictures, and asks
            whether you&rsquo;ll upload some for this campaign. Without any, the email is built from
            type and colour alone.
          </p>
        </div>
      </Section>

      {/* ===================== 03 — one turn ===================== */}
      <Section
        num="03"
        title="What happens when you send one message"
        intro={
          <p>
            Every message goes to the campaign strategist first — the one you&rsquo;re talking to.
            It decides what your message actually needs, and most messages need less than you might
            expect. Each box says what that step is handed, because that is most of why the answers
            come out the way they do.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramTurn />
        </Figure>

        <h3 className="doc-h3">How it reads your message</h3>
        <ul className="doc-list">
          <li>
            <strong>A question</strong> — &ldquo;why a story-led opening?&rdquo;, &ldquo;is this
            cadence too aggressive?&rdquo; — gets an answer and nothing else. It never rewrites the
            plan just because you mentioned it.
          </li>
          <li>
            <strong>A request for something new</strong> gets a plan as soon as there&rsquo;s enough
            to plan from, and it only asks you more when something it genuinely needs is missing.
          </li>
          <li>
            <strong>A change</strong> moves only the pieces that change touches — see the next
            section.
          </li>
          <li>
            <strong>A go-ahead</strong> — &ldquo;looks good, let&rsquo;s do the design&rdquo; —
            starts the next step and tells you what to expect.
          </li>
          <li>
            <strong>When it can&rsquo;t tell which</strong>, it treats your message as a question and
            asks what you&rsquo;d like made.
          </li>
        </ul>

        <h3 className="doc-h3">Plan, then copy, then design</h3>
        <p className="doc-lead">
          That is the default order, and the strategist chooses how much of it runs at once. Some
          campaigns are better reviewed as words before anyone designs them; others you&rsquo;ll want
          in one go. When both the copy and the design are asked for, the copy is always written
          first, because the designer builds around it. On a sequence, it sends the specialists to
          every email still missing — never just the first one.
        </p>
        <p className="doc-lead">
          Very long conversations are condensed automatically: the most recent messages are kept
          as they are, everything older becomes a summary, and every file you&rsquo;ve sent survives
          the trim.
        </p>
      </Section>

      {/* ===================== 04 — changing something ===================== */}
      <Section
        num="04"
        title="Changing something: edit, don’t rebuild"
        intro={
          <p>
            Most of a session is asking for changes, and the agent is built to make a change without
            disturbing anything you didn&rsquo;t ask about. It decides two things: which pieces the
            change has to reach, and whether to edit them or start again.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramEdits />
        </Figure>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why edit rather than regenerate?</strong> Regenerating an email to change one
            colour quietly rewrites everything else you had already approved — the result is similar,
            not the same, and you&rsquo;d have to check all of it again. Editing in place means the
            parts you didn&rsquo;t mention come back exactly as they were. So when it isn&rsquo;t sure
            whether you meant a tweak or a fresh start, it always treats it as a tweak.
          </p>
        </div>
      </Section>

      {/* ===================== 05 — pictures and files ===================== */}
      <Section
        num="05"
        title="Pictures and files"
        intro={
          <p>
            There are three ways a picture or a file reaches the agent, and they are treated very
            differently. Two of them can end up in the email. The third only ever informs it.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>Attachments shape the email; only images end up in it.</b> A rival&rsquo;s email you
              attach can steer the layout and the tone, but it is never pasted in. To put a picture in
              the email, upload it as an image for the campaign.
            </>
          }
        >
          <DiagramImages />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>Images you upload</h3>
            <dl>
              <dt>Named by you</dt>
              <dd>
                Each image is uploaded under a name, and that name is how the plan, the copy and the
                design all refer to it.
              </dd>
              <dt>Seen, not just listed</dt>
              <dd>
                The designer receives the actual picture, so it can pull colours from it and judge
                whether it&rsquo;s strong enough to lead a section.
              </dd>
              <dt>Used ahead of the homepage</dt>
              <dd>
                Where an upload and a homepage picture would do the same job, the upload wins. The
                two can sit in the same email, but never as the same picture twice.
              </dd>
              <dt>Shown in the preview</dt>
              <dd>Your uploads appear in the Design tab exactly where the email places them.</dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>Files you attach in chat</h3>
            <dl>
              <dt>Kept for the whole session</dt>
              <dd>
                Each file is given a short label when it arrives — <em>att-1</em>, <em>att-2</em>{' '}
                — and stays available however many messages ago that was.
              </dd>
              <dt>Found from your words</dt>
              <dd>
                &ldquo;The brief I sent earlier&rdquo; is enough. You never need to re-upload
                something to talk about it again.
              </dd>
              <dt>Pointed at, not handed over</dt>
              <dd>
                The copywriter and the designer can already see every file, because they read the
                conversation. What the strategist adds is <em>which</em> file a job is about —
                &ldquo;follow the layout in att-3, not its copy&rdquo; — so nobody has to guess
                between four.
              </dd>
              <dt>Only files it can read</dt>
              <dd>
                JPEG, PNG, WebP and PDF, up to 10 MB each. Anything else stops the message with a
                note naming the file, rather than being dropped quietly.
              </dd>
            </dl>
          </div>
        </div>
      </Section>

      {/* ===================== 06 — the specialists ===================== */}
      <Section
        num="06"
        title="The three specialists, and what each one knows"
        intro={
          <>
            <p>
              Each owns exactly one tab and nobody else writes it. The strategist plans and never
              writes copy; the copywriter writes and never decides the look; the designer builds and
              never rewords a line. Keeping those lines sharp is what lets one of them be changed
              without the other two drifting.
            </p>
            <p>
              None of them is a general writing assistant pointed at email. Each carries its own body
              of email-specific craft — the character limits, the cadences, the inbox constraints and
              the design rules that decide whether an email gets opened, read and acted on.
            </p>
          </>
        }
      >
        <Panel
          num="01"
          title="The campaign strategist"
          owns="Owns: the plan"
          lede={
            <>
              <p>
                The one you talk to. It reads your message, decides what it needs, and — when
                something is to be made — writes the plan on your Strategy tab: the kind of email,
                one email or a sequence, the objective, the campaign concept, and a brief for each of
                the other two.
              </p>
              <p>
                The brief to the copywriter is direction, not a script. The brief to the designer is
                deliberately two or three sentences — the brand personality to lean into, the mood,
                one word for the visual signature — because{' '}
                <strong>the designer is given spirit, not a specification</strong>. Your design
                system already settles the specifics.
              </p>
              <p>
                It also writes the two parts nobody else may: which of your personas the email is
                for and why, and any warnings.
              </p>
            </>
          }
        >
          <h4>What its brief to the copywriter covers</h4>
          <ul>
            <li>
              <strong>Subject and preview</strong> — the angle, the tone, a length target, and what
              to avoid.
            </li>
            <li>
              <strong>The body</strong> — how the argument is structured for how well the reader
              already knows you, the opening hook, the kind of proof (a story, real figures, a
              review, a before-and-after), a word count, and the footer the law requires.
            </li>
            <li>
              <strong>The buttons</strong> — how many, what the main one asks the reader to do, and
              where they sit for the email&rsquo;s length.
            </li>
            <li>
              <strong>A/B tests</strong> — which parts are worth testing, a stated prediction for
              each, and the number that will settle it.
            </li>
          </ul>

          <h4>Sequences, and how they&rsquo;re paced</h4>
          <p className="doc-know-lead">
            <strong>One email by default</strong> — a sequence only when you ask for one or the goal
            genuinely needs several touches. These are its starting points, flexed to your brand and
            audience:
          </p>
          <Bench
            rows={[
              ['Welcome', '3–5 emails over 7–14 days'],
              ['Onboarding', '4–7 over 2–4 weeks, set off by what each person does'],
              ['Abandoned cart', '3 over 72 hours'],
              ['After a purchase', '3–5 over 30 days'],
              ['Winning people back', '2–3 over 2 weeks, after about 30 days of silence'],
              ['Cold outreach', '4–7 over 2–3 weeks'],
            ]}
          />
          <ul>
            <li>
              <strong>Every step brings something new</strong> — a new angle, new evidence, a new
              hook. Never just a polite reminder of the last one.
            </li>
            <li>The gaps between emails grow as the sequence goes on.</li>
            <li>
              Each step has its own trigger, its own brief for the words and its own direction for
              the look, and the sequence has a specific rule for when someone leaves it.
            </li>
          </ul>

          <h4>Warnings it raises</h4>
          <ul>
            <li>
              Cold outreach, bulk-send compliance, brand compliance, deliverability risk, and a
              caveat on how something can be measured — each marked low, medium or high, and only
              when one genuinely applies.
            </li>
          </ul>

          <h4>Discipline</h4>
          <ul>
            <li>
              It never invents statistics, awards, quotes or personas. Everything factual comes from
              your Blueprint or your answers.
            </li>
            <li>
              Your Blueprint is a reference, not a cage — but if it goes against the Blueprint, it
              says so to you rather than doing it quietly.
            </li>
            <li>
              Its replies are short — usually a sentence or two. The detail lives in the plan, not in
              the chat.
            </li>
            <li>
              It can search the web for email strategy, and for what your category is doing right
              now.
            </li>
          </ul>
        </Panel>

        <Panel
          num="02"
          title="The copywriter"
          owns="Owns: what the email says"
          lede={
            <>
              <p>
                It writes the final words in your brand&rsquo;s voice: the subject lines with their
                preview text, the body, every button, and the A/B tests. On a sequence, every step.
              </p>
              <p>
                <strong>Every email comes back with at least three subject lines</strong>, each on
                a clearly different angle and labelled honestly — so what you&rsquo;re choosing
                between is a real test, not three rewordings.
              </p>
              <p>
                It writes the body to show the designer its shape as well as its words — a punchy
                headline on its own line, a figure that could be a callout, a short list, a pull
                quote — so the designer can make real layout decisions from it. It never decides what
                anything looks like.
              </p>
            </>
          }
        >
          <h4>Where the words have to fit</h4>
          <Bench
            rows={[
              ['Subject line', '30–50 characters, with the hook in the first 30 — phones cut off the rest'],
              ['Preview text', 'about 85 characters, continuing the subject line — never repeating it'],
              ['Button', '2–5 words: an action and what you get from it'],
              ['Paragraph', 'one idea, one to three sentences'],
            ]}
          />

          <h4>The rules it writes to</h4>
          <ul>
            <li>
              <strong>Useful, urgent, unique, ultra-specific</strong> — every subject line hits at
              least three of the four. Sentence case. No capitals for shouting, no stacked
              exclamation marks, no fake &ldquo;Re:&rdquo; or &ldquo;Fwd:&rdquo;, and no yes-or-no
              question the reader can answer without opening.
            </li>
            <li>
              <strong>The opening line earns the read.</strong> A pattern interrupt or the
              persona&rsquo;s own problem — never &ldquo;Hi, hope this finds you well.&rdquo;
            </li>
            <li>
              Written to be skimmed: second person, short sentences mixed with shorter ones, concrete
              over abstract, specific over generic.
            </li>
            <li>
              <strong>Proof is woven into the argument</strong>, not bolted on at the end — and it
              is only ever proof you actually have.
            </li>
            <li>
              Buttons in the first person often win — &ldquo;Get my report&rdquo; over &ldquo;Get
              your report&rdquo; — and are never &ldquo;Click here&rdquo;, &ldquo;Submit&rdquo; or
              &ldquo;Learn more&rdquo;. One line near the main button takes the friction out:
              no card needed, two minutes, cancel any time.
            </li>
            <li>When in doubt, shorter wins.</li>
          </ul>

          <h4>A/B tests</h4>
          <ul>
            <li>
              Only where a test is worth running — subject lines on most marketing emails, never on
              confirmations.
            </li>
            <li>
              Each written as a prediction: <em>if we change this, that number improves, because
              of this.</em>
            </li>
            <li>
              <strong>Judged on clicks or replies, never on opens</strong>, which are no longer a
              reliable count.
            </li>
            <li>
              A button under test carries one version per side of the test; a button that
              isn&rsquo;t carries exactly one.
            </li>
          </ul>

          <h4>Fill-in fields</h4>
          <ul>
            <li>
              The body carries named fields for what only your sending tool can know — the
              reader&rsquo;s first name, your company&rsquo;s address, where each button leads, the
              unsubscribe link.
            </li>
            <li>
              <strong>Promotional, bulk and cold emails always carry an unsubscribe link and a
              physical address</strong>, as fill-in fields — never an address it made up.
            </li>
            <li>
              Every edit is checked for buttons and fields that no longer line up with the copy, and
              a mismatch goes straight back to the copywriter to fix — so a button pointing at
              something that was renamed away is caught on the spot.
            </li>
          </ul>

          <h4>Discipline</h4>
          <ul>
            <li>It never invents statistics, awards, quotes, reviews or customer stories.</li>
            <li>
              <strong>Ask for a change and it patches that part</strong> — one subject line, one
              sentence, one button — leaving every other word exactly as it was. It writes the whole
              email again only when you ask for a fresh start.
            </li>
          </ul>
        </Panel>

        <Panel
          num="03"
          title="The designer"
          owns="Owns: what the email looks like"
          lede={
            <>
              <p>
                It builds the finished email — a complete, self-contained page of four to seven
                distinct sections — from the plan&rsquo;s look-and-feel, the finished copy and your
                brand&rsquo;s design system. <strong>It lays the copy out and may adapt it to the
                design</strong> — splitting a passage, pulling out a quote, trimming a phrase — but
                keeps its meaning, claims, numbers and offer.
              </p>
              <p>
                Your design identity is used exactly — the colour codes, the fonts, the corner
                radius, the button styles. Its freedom is in the composition: the layout, the
                pacing, which moments are quiet and which are loud. Ask for a different colour or
                font and you get it, even where it departs from the design system.
              </p>
              <p>
                It works to be screenshotted, not to fill a template — but always as your brand,
                never as a reinvention of it.
              </p>
            </>
          }
        >
          <h4>Breaking its own default look</h4>
          <p className="doc-know-lead">
            Left to itself it drifts toward one look: a cream background, a serif headline and
            terracotta accents. That suits editorial, hospitality and lifestyle brands and is wrong
            for most others. So it pins your brand&rsquo;s exact values first, and where your
            Blueprint is silent it reasons from your category instead:
          </p>
          <Bench
            rows={[
              ['Finance, software', 'cool greys into near-black, one saturated accent, a geometric sans-serif'],
              ['Health, wellness', 'clean off-white, one calm accent, a humanist sans-serif'],
              ['Children, playful', 'saturated colour, rounded type set large, generous corners'],
              ['Energy, sport, gaming', 'dark canvases, neon or metallic accents, condensed type, sharp edges'],
              ['Luxury, fashion', 'deep neutrals, ultra-thin serifs or a crisp sans, hairline rules'],
              ['Lifestyle shops', 'the product photography leads; colour comes from the pictures'],
            ]}
          />

          <h4>The newsletter test</h4>
          <p className="doc-know-lead">
            A campaign email is a poster, not a newsletter. It holds every design to these as pass
            or fail, because a wall of text with nothing to look at reads as a template
            however good the colours are:
          </p>
          <ul>
            <li>
              <strong>Never more than two paragraphs in a row</strong> without something to break
              them — a picture, a drawn figure, a colour band, a button or a headline.
            </li>
            <li>
              No single block of text in the design longer than two sentences — a longer passage
              is broken into separate pieces.
            </li>
            <li>
              Body text at 16–18px, and <strong>never shrunk to make the copy fit</strong> — a long
              passage is broken up, or gets more room or a different treatment instead.
            </li>
            <li>A section that is only text has a headline doing real display work, 28px or more.</li>
          </ul>

          <h4>Built for the inbox</h4>
          <ul>
            <li>
              A readable column of 600–640px, with colour bands and hero pictures free to run the
              full width.
            </li>
            <li>
              <strong>Phone first</strong> — most email is opened on one. Columns collapse to one,
              large type scales down, and every button is at least 44px square to tap.
            </li>
            <li>
              Buttons are built so they survive email programs that strip styling, and{' '}
              <strong>one action is always visually dominant</strong>, however many the copy
              carries.
            </li>
            <li>
              One clear focal point per section, and an obvious jump in size from headline to body.
            </li>
            <li>
              Your logo small, in the masthead — the campaign is the hero, not the brand mark. The
              footer is quiet: readable, but not competing.
            </li>
            <li>Dark-mode styling only when you ask for it.</li>
            <li>
              Any font that isn&rsquo;t already on every device is loaded properly, with a safe
              fallback behind it.
            </li>
          </ul>

          <h4>Readable by everyone</h4>
          <ul>
            <li>
              Text contrast of at least 4.5 to 1, or 3 to 1 for large display type —{' '}
              <strong>checked against the coloured band the text actually sits on</strong>, which
              is where contrast usually fails.
            </li>
            <li>
              Every picture&rsquo;s alternative text describes what it shows and why it&rsquo;s there
              — &ldquo;Founder pouring serum at a kitchen counter&rdquo;, never &ldquo;product
              image&rdquo;.
            </li>
            <li>Headings descend in order, and every link reads as an action on its own.</li>
          </ul>

          <h4>Drawn, not just placed</h4>
          <ul>
            <li>
              <strong>Every email carries at least one thing it has drawn itself</strong> —
              icons, a section divider, a badge, a small &ldquo;how it works&rdquo; diagram — in
              your exact colours, in one consistent style across the email.
            </li>
            <li>
              When the copy has numbers, a figure can be set large as type or drawn as a chart,
              whichever makes the point. It only ever uses numbers that are in the copy, and keeps
              the proportions true.
            </li>
            <li>
              Drawings go on top of photographs too — a badge in the corner, a circle around the
              product, a shaped edge into the next section.
            </li>
          </ul>

          <h4>Changing it afterwards</h4>
          <ul>
            <li>
              <strong>Edits are surgical.</strong> It reads the email as it stands, changes only the
              exact code your request touches, and reads it again if a change doesn&rsquo;t land.
              Nothing else moves.
            </li>
            <li>
              It rebuilds from scratch only when you ask for a new campaign or a completely
              different direction.
            </li>
          </ul>
        </Panel>
      </Section>
    </div>
  );
}
