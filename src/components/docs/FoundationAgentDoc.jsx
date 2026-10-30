import React from 'react';
import {
  DiagramContext,
  DiagramOpening,
  DiagramOrder,
  DiagramTurn,
  DiagramFeeds,
} from './FoundationDocDiagrams.jsx';

// Static documentation for the Foundation Agent — the one that builds the
// Company Blueprint. No data fetching, no props from the wire: this is a
// written page, kept in sync by hand with the workflow's prompts and graph.
// Built the same way as MetaAdAgentDoc.jsx and EmailAgentDoc.jsx and using only
// the `.doc-*` classes those pages already use, so the print stylesheet and the
// Word export need nothing new.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// FoundationDocDiagrams.jsx rather than in another paragraph here.

// No `updated` date, for the same reason as the other pages: a stamp is only as
// true as the last person to remember it, and a stale one is worse than none.
export const FOUNDATION_DOC_META = {
  title: 'Foundation Agent',
  subtitle: 'How it reads your brand, what it asks you, and how the Company Blueprint gets written.',
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

export default function FoundationAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what goes in, what comes out ===================== */}
      <Section
        num="01"
        title="What goes in, and what comes out"
        intro={
          <>
            <p>
              The Foundation Agent is where every brand starts, and the one every other agent depends
              on. You give it your website address and whatever documents you have. It reads them,
              asks a handful of questions only you can answer, and then writes four documents about
              your brand, followed by the Company Blueprint that ties them together.
            </p>
            <p>
              It lives on the Foundations tab. You talk to it in the chat; the panel beside the chat
              shows each document&rsquo;s progress, opens any of them to read, and lets you approve
              the ones that are ready.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>The website address is the only thing it must have.</b> Documents make every
              deliverable sharper, but they are optional. Without them it works from your website,
              your answers and its own research on the web.
            </>
          }
        >
          <DiagramContext />
        </Figure>
      </Section>

      {/* ===================== 02 — the first read and the questions ===================== */}
      <Section
        num="02"
        title="The first read, and the questions it asks once"
        intro={
          <p>
            Before anything is written, the agent reads everything it was given, all at the same
            time, and searches the web for whatever it can look up. Only then does it ask about what
            is still missing. The questions exist so the four documents are about <em>your</em>{' '}
            brand rather than a plausible guess at a brand like yours. A gap left unasked gets filled
            with exactly that kind of guess.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramOpening />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>How it writes the questions</h3>
            <dl>
              <dt>Three tests, all of them</dt>
              <dd>
                A question is asked only if your materials don&rsquo;t answer it, a search
                can&rsquo;t find it, and the answer lives inside your business: your intentions, your
                priorities, the constraints you work under.
              </dd>
              <dt>Bundles what travels together</dt>
              <dd>
                What you&rsquo;re trying to become and who you&rsquo;re trying to reach are one
                picture, so they&rsquo;re asked as one question, and one answer improves several
                documents at once.
              </dd>
              <dt>Offers situations, not jargon</dt>
              <dd>
                &ldquo;We charge more because the ingredients cost more, and we say so
                plainly&rdquo; rather than &ldquo;premium, quality-led positioning&rdquo;. You pick
                by recognising your own circumstances, not by decoding marketing vocabulary.
              </dd>
              <dt>Uses your real names</dt>
              <dd>
                The options name the competitors, buyer worries and category rules it actually found.
                A filler option that would fit any brand, such as &ldquo;Other&rdquo; or
                &ldquo;Quality and service&rdquo;, is not allowed.
              </dd>
              <dt>Lets you pick several, or write your own</dt>
              <dd>
                Every question takes more than one answer, and each has a box for typing your own
                when none of the options fits.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>What it won&rsquo;t ask</h3>
            <dl>
              <dt>Anything your materials say</dt>
              <dd>
                Your documents and your website are read in full first. A fact that is in either of
                them is never put back to you as a question.
              </dd>
              <dt>Anything it can look up</dt>
              <dd>
                Competitors, market size, regulations, what&rsquo;s trending in your category. It
                researches those itself, and uses what it finds to write sharper options.
              </dd>
              <dt>Your company&rsquo;s name</dt>
              <dd>It takes the name from your materials, or failing that, from your web address.</dd>
              <dt>A fixed number of questions</dt>
              <dd>
                Usually three to five, but that is what it tends to come to, not a target. A brand
                with rich materials gets fewer; a brand with a thin website and no documents may get
                more.
              </dd>
              <dt>Anything as if it were required</dt>
              <dd>Every answer is optional, and a skipped question is never asked again.</dd>
            </dl>
          </div>
        </div>

        <div className="doc-note">
          <p>
            <strong>Two situations always earn a question.</strong> If your category is regulated,
            say anything people eat, put on their skin, or take as medicine, or anything financial,
            it asks what you&rsquo;re allowed to claim, because the Brand Bible&rsquo;s rules on
            wording depend on it. And if your website sells something clearly different from what
            your documents describe, it asks which is right. Otherwise the four documents would be
            written about two different companies.
          </p>
        </div>

        <p className="doc-fine">
          <strong>Documents it can read:</strong> PDF, Word, PowerPoint, Excel, CSV, Markdown and plain
          text files, plus JPEG, PNG, WebP and GIF images. Each is read once, at the start, into a
          short brief of the brand language, proof, products, competitors, market and buyer details
          it holds.
        </p>
      </Section>

      {/* ===================== 03 — the order ===================== */}
      <Section
        num="03"
        title="The order the documents are written in"
        intro={
          <p>
            The four documents are not independent. Two of them describe the world your brand lives
            in, and the other two are written knowing that world. The Blueprint comes last because
            its whole job is to read across all four. The agent keeps that order for you, and every
            document waits for your approval before it counts as final.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramOrder />
        </Figure>

        <h3 className="doc-h3">Why that order</h3>
        <p className="doc-lead">
          The Market Analysis and the Competitive Analysis need nothing but your materials and the
          web, so they go first and run side by side. The Buyer Personas are built to fit them: the
          market&rsquo;s segments and the competitors&rsquo; audiences decide who the personas are and
          how they rank. The Brand Bible reads them too, but only as background. It is about what
          your brand <em>is</em>, built from your own materials, and it deliberately does not bend
          itself to chase a gap a competitor left open.
        </p>

        <h3 className="doc-h3">Approving, and asking for changes</h3>
        <ul className="doc-list">
          <li>
            <strong>Approve</strong> by ticking documents in the progress panel and pressing Accept,
            or simply by saying so in the chat. &ldquo;Looks good&rdquo; counts when it&rsquo;s clear
            you mean a document; the agent works out which one from the conversation.
          </li>
          <li>
            <strong>Ask for changes</strong> and that document is written again with your feedback
            folded in. Several can be changed in one message, each with its own instruction.
          </li>
          <li>
            <strong>Those are the only two choices.</strong> There is no discarding a draft and no
            going back to an earlier version; a change is always a new draft for you to approve.
          </li>
          <li>
            <strong>The approved version is the one that counts</strong> everywhere a document is
            used: by the documents written after it, inside the Blueprint, and by every other agent.
            A change you haven&rsquo;t approved yet counts only once you do.
          </li>
          <li>
            <strong>&ldquo;Change the Blueprint&rdquo; means its summary.</strong> The four documents
            beneath it are left alone, unless your feedback is really about one of them, such as
            &ldquo;fix the competitor list&rdquo;. Then that document is changed first and the
            summary is written again after it.
          </li>
        </ul>
      </Section>

      {/* ===================== 04 — one message ===================== */}
      <Section
        num="04"
        title="What happens when you send one message"
        intro={
          <p>
            Every message goes to the strategist you&rsquo;re talking to. It never writes a document
            itself. It decides what your message needs, and sends a dedicated writer for each document
            that has to be produced. Each box below says what that step is given, because that is most
            of why the documents come out the way they do.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramTurn />
        </Figure>

        <h3 className="doc-h3">How it reads your message</h3>
        <ul className="doc-list">
          <li>
            <strong>A question about a document</strong>, such as &ldquo;why is this brand a direct
            competitor?&rdquo; or &ldquo;does this persona feel right?&rdquo;, gets a straight answer
            that points to the section it&rsquo;s about, with an honest opinion when you ask for one.
            A question is never treated as a request to rewrite.
          </li>
          <li>
            <strong>A strategic discussion</strong> about trade-offs, sequencing or a contradiction
            between two documents gets a real recommendation. It searches the web when the question
            needs a fresh fact.
          </li>
          <li>
            <strong>A request</strong> sends the writers, each with its own instruction written from
            what you said. Two documents never get the same sentence copied across.
          </li>
          <li>
            <strong>An approval</strong> is recorded, and it tells you what that approval unlocks.
          </li>
          <li>
            <strong>Something unrelated to your brand</strong> gets a friendly redirect back to where
            you are.
          </li>
        </ul>
        <p className="doc-lead">
          Whatever you asked, the reply is short and ends with the single most useful next step
          toward an approved Blueprint: review what just landed, approve what&rsquo;s waiting, or
          write what&rsquo;s now unlocked. You should never have to ask what comes next.
        </p>

        <h3 className="doc-h3">Files you attach in chat</h3>
        <ul className="doc-list">
          <li>
            <strong>Kept for the whole session.</strong> Each file gets a short label when it arrives,
            such as <em>att-1</em> or <em>att-2</em>, and stays available however long ago you sent it.
            &ldquo;The tone document I sent earlier&rdquo; is enough to find it again.
          </li>
          <li>
            <strong>Sent only where it belongs.</strong> A writer sees a file only when the strategist
            sends it, and only with an instruction saying what the file is and what to do with it.
            Different documents can get different files in the same message.
          </li>
          <li>
            <strong>Separate from your starting documents.</strong> Those were read once at the start
            and feed every document. A file attached in chat is used for the work you attached it to.
          </li>
          <li>
            <strong>Only files it can read:</strong> PDF, JPEG, PNG and WebP, up to 10 MB each.
          </li>
        </ul>
        <p className="doc-fine">
          Very long conversations are condensed automatically. The most recent messages are kept
          word for word, older ones become a summary, and every file you&rsquo;ve sent survives the
          trim.
        </p>
      </Section>

      {/* ===================== 05 — where the Blueprint goes ===================== */}
      <Section
        num="05"
        title="Where your Blueprint goes next"
        intro={
          <p>
            The Foundation is written once and read many times. Every other Growvana agent starts a
            session by reading from it, so the tone of an email, the audience behind an ad and the
            claims on a product page all trace back to the documents you approved here.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>Each agent reads the Foundation when its session starts.</b> A change you approve
              here reaches that agent&rsquo;s next session, not one already running. The Brand Bible
              and the Buyer Personas must both exist, at least as drafts, before the Email, Meta Ad or
              PDP Agent can start from your brand.
            </>
          }
        >
          <DiagramFeeds />
        </Figure>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why approve, if a draft is read anyway?</strong> An agent takes the approved
            version of a document when there is one, and the latest draft only when nothing has been
            approved yet. Approving is how you decide which version every agent works from. Once
            you&rsquo;ve approved a document, asking for a change here won&rsquo;t quietly reach your
            email campaigns or ads; the approved one keeps counting until you approve the new one.
          </p>
        </div>

        <p className="doc-fine">
          <strong>No Foundation yet?</strong> The Email, Meta Ad and PDP agents can also start from a
          PDF of a Blueprint, as long as it carries <em>Competitive Analysis</em>,{' '}
          <em>Brand Bible</em> and <em>Buyer Personas</em> as headings in that order. A PDF carries no
          homepage pictures, so those agents work without them.
        </p>
      </Section>

      {/* ===================== 06 — the five documents ===================== */}
      <Section
        num="06"
        title="The five documents, and what goes into each"
        intro={
          <>
            <p>
              Each document has its own writer, and each writer carries its own idea of what a good
              version of that document is. They share one discipline. Every fact must trace back to
              your documents, your website, your answers or a web search. Nothing is invented: no
              market figures, competitors, awards, quotes or customer details. A section that
              can&rsquo;t be supported is cut rather than padded.
            </p>
            <p>
              They also share one rule for what earns a place: <strong>every finding ends with a
              &ldquo;so what&rdquo; for your brand</strong>. These are working documents for the agents
              that come after, not reports to file away.
            </p>
          </>
        }
      >
        <Panel
          num="01"
          title="Market Analysis"
          owns="Written first · 400–600 words"
          lede={
            <>
              <p>
                The market your brand competes in: how big it is, where it&rsquo;s heading, and the
                rules it plays by. It is not an industry report. A market fact earns its place only
                when it changes a decision about positioning, pricing, channel or timing.
              </p>
              <p>
                <strong>Every figure carries its source and its year</strong>, and market sizes are
                checked against a second independent source wherever one exists.
              </p>
            </>
          }
        >
          <h4>What&rsquo;s in it</h4>
          <ul>
            <li>
              <strong>Market definition</strong>: what&rsquo;s in scope and out, the adjacent markets
              worth watching, the geographies and the channels that matter.
            </li>
            <li>
              <strong>Market size</strong>: the whole market, the part you can serve, the part you can
              realistically win, and the growth rate over a stated period.
            </li>
            <li>
              <strong>Growth drivers and headwinds</strong>: the forces expanding the market, each
              paired with what holds demand back.
            </li>
            <li>
              <strong>Consumer trends</strong>: durable shifts in how people shop, what they value,
              who is gaining spending power, and where buying is moving. Not fads.
            </li>
            <li>
              <strong>Rules and regulation</strong>: advertising and claims rules, privacy, product
              rules and the bodies that govern your category, with any rule that limits what you can
              say flagged.
            </li>
            <li>
              <strong>Segments</strong>: the customer groups in the market that matter most to you.
            </li>
            <li>
              <strong>Strategic implications</strong>: ranked moves on positioning, pricing, channels
              and timing, and a one-to-three-year trajectory with its assumptions stated.
            </li>
          </ul>
        </Panel>

        <Panel
          num="02"
          title="Competitive Analysis"
          owns="Written first · 400–600 words"
          lede={
            <>
              <p>
                Who you&rsquo;re up against and where you can win. Every competitor named is checked
                on the web; none is taken on trust or made up.
              </p>
              <p>
                <strong>It looks for what competitors conspicuously don&rsquo;t say</strong> as
                closely as what they do, because the space nobody is claiming is where the most useful
                finding usually is.
              </p>
            </>
          }
        >
          <h4>The five kinds of competitor it looks for</h4>
          <Bench
            rows={[
              ['Direct', 'the same product, for the same buyer'],
              ['Indirect', 'a different product meeting the same need'],
              ['Substitute', 'a different way of solving the problem altogether'],
              ['Doing nothing', 'what the customer does today instead of buying'],
              ['Emerging', 'new entrants and neighbours moving into the space'],
            ]}
          />

          <h4>What&rsquo;s in it</h4>
          <ul>
            <li>
              <strong>The competitor set</strong>, each with its positioning, price tier, core
              promise and the proof it leans on.
            </li>
            <li>
              <strong>Strengths and weak spots</strong> for each, grounded in real customer reviews
              where possible.
            </li>
            <li>
              <strong>What each one says</strong>: tagline, emotional register, repeated phrases, how
              they prove things, quoted from their own sites and ads.
            </li>
            <li>
              <strong>A positioning map</strong> on the two axes that best separate your category,
              with every competitor placed and the empty space called out.
            </li>
            <li>
              <strong>The open space</strong>: the single sharpest position nobody owns, tested three
              ways. Do buyers want it? Can you credibly claim it? Can competitors easily copy it?
            </li>
            <li>
              <strong>Ways to stand apart</strong>, each tagged as product, experience, positioning or
              business model, and a ranked list of the moves that follow.
            </li>
          </ul>
        </Panel>

        <Panel
          num="03"
          title="Brand Bible"
          owns="Written once the first two exist · 700–900 words"
          lede={
            <>
              <p>
                Who your brand is and how it speaks, written to be concrete enough that another agent
                can produce on-brand copy from it with no further guidance. It is the document every
                other agent leans on most.
              </p>
              <p>
                <strong>Every claim earns its place with proof.</strong> A messaging pillar that
                can&rsquo;t be backed by a figure, a certification, a testimonial or a guarantee is
                removed, not softened.
              </p>
            </>
          }
        >
          <h4>What&rsquo;s in it</h4>
          <ul>
            <li>
              <strong>Identity</strong>: mission, vision, values, a short origin story, and a
              positioning statement in one fixed shape: for <em>this audience</em> who <em>needs
              this</em>, the brand is the <em>category</em> that <em>does this</em>, because of{' '}
              <em>this proof</em>.
            </li>
            <li>
              <strong>Voice and tone</strong>: each voice trait with an example of doing it and of
              getting it wrong, how the tone shifts across at least three channels, and a list of
              words that are off-brand.
            </li>
            <li>
              <strong>Messaging house</strong>: the core promise in 15 words or fewer, with the
              pillars beneath it and the proof under each pillar.
            </li>
            <li>
              <strong>Approved copy</strong>: a description of the brand at several lengths, and its
              taglines.
            </li>
            <li>
              <strong>Wording rules</strong>: words that are always fine, words and claims that are
              not, the legal limits for your category, and how AI tools may be used, including the
              human review before anything is published.
            </li>
            <li>
              <strong>Design identity</strong>: your colours as exact codes, your fonts, corner
              shapes, spacing, button styles and the overall visual direction, copied exactly from
              what was read off your homepage, never estimated or rounded.
            </li>
          </ul>
        </Panel>

        <Panel
          num="04"
          title="Buyer Personas"
          owns="Written once the first two exist · 400–600 words"
          lede={
            <>
              <p>
                The groups of people who buy from you, each one a segment rather than an imaginary
                individual. <strong>Personas are named as types</strong>, like &ldquo;The Eco-Conscious
                Homeowner&rdquo;, never with a first name like &ldquo;Sarah&rdquo;. They are a
                targeting document, not a story.
              </p>
              <p>
                Each persona has to differ from the others in who they are, what they believe or how
                they buy. Three variations of one profile is a failure. Each also has to change at
                least one decision another agent makes: which email segment, which ad audience, which
                angle.
              </p>
            </>
          }
        >
          <h4>For each persona</h4>
          <ul>
            <li>
              <strong>Who they are</strong>: age, income, life stage, location and household, always
              as ranges.
            </li>
            <li>
              <strong>What they believe</strong>: values, interests, media habits and how they shop.
            </li>
            <li>
              <strong>What frustrates them and what sets them shopping</strong>, in their own words
              where reviews, forums and social posts supply them.
            </li>
            <li>
              <strong>What moves them and what stops them</strong>: motivations, barriers and the
              objections they raise before buying.
            </li>
            <li>
              <strong>Where to reach them</strong>: the channels they use and the formats that land.
            </li>
            <li>
              <strong>What to offer them</strong>: price sensitivity, subscription or one-off, bundles,
              and how valuable they are over time.
            </li>
          </ul>

          <h4>Across all of them</h4>
          <ul>
            <li>A comparison table, one row per persona, across the axes that matter.</li>
            <li>
              Each labelled primary, secondary or tertiary, with one sentence on why: revenue,
              reachability or strategic fit.
            </li>
          </ul>
        </Panel>

        <Panel
          num="05"
          title="Company Blueprint"
          owns="Written last, on its own · 100 words"
          lede={
            <>
              <p>
                A summary of 100 words or fewer that opens the Blueprint, with the four documents
                placed beneath it exactly as they stand. Only the summary is newly written. The four
                documents are not rewritten or condensed to make it.
              </p>
              <p>
                <strong>It synthesises rather than summarises.</strong> Every sentence should say
                something the four documents imply together but none of them says alone, such as the
                positioning move that shows up in both the Brand Bible and the Competitive Analysis,
                or the trend that most affects your main buyer.
              </p>
            </>
          }
        >
          <h4>Five things it always covers</h4>
          <ul>
            <li>How your brand wins, in one sentence.</li>
            <li>The sharpest open space you&rsquo;ll occupy.</li>
            <li>The single most important force moving your category right now.</li>
            <li>Your most valuable buyer persona, by its type name, and what drives them.</li>
            <li>The top moves that show up across all four documents.</li>
          </ul>

          <h4>Discipline</h4>
          <ul>
            <li>
              The four documents are its research. It searches the web only as a last resort, for one
              missing piece.
            </li>
            <li>
              Where two documents contradict each other, it says so briefly and sides with the one you
              approved most recently.
            </li>
            <li>
              Plain short paragraphs: no headings, no bullet points, no tables. It is the first page
              someone reads.
            </li>
          </ul>
        </Panel>
      </Section>
    </div>
  );
}
