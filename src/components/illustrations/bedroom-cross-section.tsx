import { useId, type ReactNode } from "react";

export interface IllustrationCallout { text: string; x: number; y: number; width: number; accent?: "heat" | "cooling"; detail?: string; target?: readonly [number, number] }
export interface ContributorIllustration { roof: boolean; sun: boolean; externalShade: boolean; coolingEquipment: boolean }

/** Geometry is illustrative; supplied annotations must come from reported room facts. */
export function BedroomCrossSection({ callouts, contributors, fullRoom = false, children }: { callouts?: readonly IllustrationCallout[]; contributors?: ContributorIllustration; fullRoom?: boolean; children?: ReactNode } = {}) {
  const id = useId().replaceAll(":", "");
  const roof = `${id}-roof`;
  const light = `${id}-light`;
  const room = `${id}-room`;
  const wood = `${id}-wood`;
  const clip = `${id}-interior`;
  const tree = `${id}-tree`;
  const plant = `${id}-plant`;

  return <svg viewBox={contributors && !fullRoom ? "0 0 940 580" : "0 0 940 650"} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${id}-title ${id}-description`}>
    <title id={`${id}-title`}>{callouts ? "Illustrative bedroom with reported room details" : "A bedroom in the afternoon sun"}</title>
    <desc id={`${id}-description`}>{callouts ? "Illustrative architecture, sunlight and airflow. Only the annotations reflect your reported answers; the drawing does not establish facts about your home." : "Architectural cross-section of a pitched-roof bedroom with a bed, air conditioner, window and external shade. Amber lines show illustrative sunlight and blue curves show airflow."}</desc>
    <defs>
      <linearGradient id={roof} x1="470" y1="110" x2="470" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="#ecdbc2" /><stop offset="1" stopColor="#dfc9aa" /></linearGradient>
      <linearGradient id={room} x1="300" y1="290" x2="670" y2="590" gradientUnits="userSpaceOnUse"><stop stopColor="#f7f4ec" /><stop offset="1" stopColor="#fffdf8" /></linearGradient>
      <linearGradient id={light} x1="740" y1="310" x2="565" y2="600" gradientUnits="userSpaceOnUse"><stop stopColor="#ffca70" stopOpacity=".65" /><stop offset="1" stopColor="#ffd68d" stopOpacity=".38" /></linearGradient>
      <linearGradient id={wood} x1="240" y1="400" x2="270" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#d7bf9b" /><stop offset=".6" stopColor="#f2e5ce" /><stop offset="1" stopColor="#c8b08d" /></linearGradient>
      <clipPath id={clip}><path d="M247 283H727V591H247Z" /></clipPath>
      <g id={tree} fill="#a6b59a">
        <path d="M-2 180V55H3V180M0 102L-30 75M0 125L37 84" stroke="#9ea88d" strokeWidth="2" />
        <path d="M0 1C-7-8-16 1-16 9C-29 0-34 14-28 21C-45 11-50 30-39 36C-55 32-62 49-50 59C-68 66-60 80-48 82C-63 96-47 109-36 105C-38 125-19 127-10 117C-1 135 11 126 17 116C28 129 42 116 36 105C54 114 61 91 49 85C69 75 57 58 44 59C59 45 43 30 33 34C36 17 20 11 14 18C19 6 10-6 0 1Z" />
        <circle cx="-27" cy="59" r="30" fill="#c0cbb1" opacity=".5" /><circle cx="20" cy="74" r="28" fill="#bdc5a8" opacity=".5" />
      </g>
      <g id={plant} stroke="#7f8c55" strokeWidth="1.2" strokeLinecap="round">
        <path d="M0 0V-43M0-8L-12-28M0-16L14-38M0-28L-8-45" />
        <g fill="#97a26f" stroke="none"><ellipse cx="-11" cy="-30" rx="4" ry="13" transform="rotate(-35 -11 -30)" /><ellipse cx="10" cy="-35" rx="4" ry="12" transform="rotate(34 10 -35)" /><ellipse cx="-4" cy="-42" rx="3" ry="13" transform="rotate(-12 -4 -42)" /><ellipse cx="3" cy="-22" rx="4" ry="13" transform="rotate(38 3 -22)" /><ellipse cx="-14" cy="-18" rx="3" ry="10" transform="rotate(-54 -14 -18)" /><ellipse cx="13" cy="-17" rx="3.5" ry="11" transform="rotate(46 13 -17)" /></g>
        <path d="M-9 0H9L6 20H-6Z" fill="#ddd0b1" stroke="#a99879" />
      </g>
    </defs>

    <g transform={contributors && !fullRoom ? "translate(150 20) scale(.78)" : undefined}>
    {/* A quiet landscape behind the architectural section. */}
    <ellipse cx="482" cy="607" rx="447" ry="10" fill="#d8decc" opacity=".3" />
    <g opacity=".16"><use href={`#${tree}`} transform="translate(95 325) scale(1.55)" /><use href={`#${tree}`} transform="translate(181 341) scale(1.35)" /><use href={`#${tree}`} transform="translate(857 393) scale(1.15)" /><use href={`#${tree}`} transform="translate(924 374) scale(1.3)" /></g>
    <g opacity=".23"><use href={`#${tree}`} transform="translate(154 469) scale(.73)" /><use href={`#${tree}`} transform="translate(225 437) scale(.85)" /><use href={`#${tree}`} transform="translate(790 457) scale(.85)" /><use href={`#${tree}`} transform="translate(863 476) scale(.7)" /></g>
    <g stroke="#acb69c" strokeWidth="1" opacity=".3"><path d="M93 598L88 583M97 598L100 579M103 598L110 590M162 603L156 587M167 603L168 582M174 603L180 591M779 604L775 584M785 604L791 584M829 602L824 586M835 602L838 581M898 603L894 587M904 603L913 585" /></g>

    {/* Afternoon sun uses translucent circles, not a thermal map. */}
    {(!contributors || contributors.sun) && <g transform={contributors ? "translate(0 -60)" : undefined}>
    <circle cx="865" cy="192" r="88" fill="#ffb13b" opacity=".09" />
    <circle cx="865" cy="192" r="63" fill="#ffb13b" opacity=".14" />
    <circle cx="865" cy="192" r="39" fill="#ffb13b" stroke="#ffe1ad" />
    <g stroke="#eba444" strokeWidth="1" strokeDasharray="3 6" opacity=".85">
      <path d="M844 225L702 353M854 229L717 422M866 232L731 553" />
    </g>
    </g>}

    {/* Roof and timber section edges. */}
    <path d="M217 278H741V609H217Z" fill={`url(#${wood})`} stroke="#242c2b" strokeWidth="1.5" />
    <path d="M231 281H729V592H231Z" fill={`url(#${room})`} stroke="#494c45" strokeWidth="1" />
    <path d="M187 280L479 109L769 280Z" fill={`url(#${roof})`} stroke="#18201e" strokeWidth="2" strokeLinejoin="round" />
    <g stroke="#ad9778" strokeWidth=".75" opacity=".55">
      <path d="M207 278L479 128L746 278M236 277L479 144L719 277M267 277L479 160L687 277M298 277L479 176L655 277M479 128V176" />
    </g>
    <path d="M222 283V591M226 283V591M735 284V591" stroke="#b39a78" strokeWidth=".65" />

    <g clipPath={`url(#${clip})`}>
      {(!contributors || contributors.sun) && <>
      <path d="M727 305L504 592H727Z" fill={`url(#${light})`} />
      <path d="M727 304L248 591H503Z" fill="#fffef9" opacity=".65" />
      <path d="M500 592L523 579H727V592Z" fill="#eda454" opacity=".3" />
      </>}

      {/* Air conditioning unit and thin blue airflow lines. */}
      {(!contributors || contributors.coolingEquipment) && <>
      <rect x="250" y="308" width="96" height="39" rx="5" fill="#fafbf9" stroke="#263538" strokeWidth="1.2" />
      <path d="M260 336H336M262 340H334M294 321H301" stroke="#a4b2b4" strokeWidth=".9" />
      <path d="M252 345H343" stroke="#6e7a7b" strokeWidth=".8" />
      {!contributors && <g stroke="#93c9e5" strokeWidth="1.1" strokeLinecap="round" opacity=".9">
        <path d="M258 365C265 394 286 408 313 424M281 359C293 394 342 414 374 439M307 359C320 386 357 398 392 417" />
        <path d="M319 428L331 435" strokeDasharray="5 5" />
      </g>}
      </>}

      {/* Bed: fine outlines, linen, warm terracotta throw. */}
      <path d="M247 430L253 432V566H247Z" fill="#e5d7bd" stroke="#817f70" strokeWidth="1" />
      <path d="M253 432L260 439V558H253Z" fill="#faf6eb" stroke="#bbb29d" strokeWidth=".8" />
      <rect x="261" y="530" width="248" height="57" rx="5" fill="#f6f1e6" stroke="#303735" strokeWidth="1.1" />
      <path d="M262 529H495C503 529 504 535 504 540V554H262Z" fill="#fdfbf4" stroke="#474c43" strokeWidth="1" />
      <path d="M299 526C292 521 293 513 305 511C326 506 342 512 345 520C348 526 344 529 337 529H305Z" fill="#fffdf7" stroke="#263330" strokeWidth="1.1" />
      <path d="M384 529H489Q501 529 501 538V554H384Z" fill="#c87c54" stroke="#92573e" strokeWidth="1" />
      <path d="M389 532H491M395 534V551M486 533V551" stroke="#dd9b72" strokeWidth=".7" opacity=".7" />
      <path d="M264 586V592M504 586V592" stroke="#393d34" strokeWidth="3" />

      {/* Bedside table and plant. */}
      <path d="M258 541H300V559H258Z" fill="#cbab78" stroke="#67634f" strokeWidth="1" />
      <path d="M262 559V591M295 559V591M262 578H295" stroke="#8d7757" strokeWidth="2" />
      <circle cx="279" cy="550" r="1.5" fill="#59594c" />
      <use href={`#${plant}`} transform="translate(281 521) scale(.7)" />

      {/* Framed art, chest of drawers and a second plant. */}
      <path d="M641 413H676V464H641Z" fill="#d4b583" stroke="#bc9c67" strokeWidth="1" />
      <path d="M645 417H672V460H645Z" fill="#ebe2c8" stroke="#faf1dc" strokeWidth="1" />
      <path d="M646 454L655 434L660 440L671 419V459H646Z" fill="#c1c0a5" opacity=".6" />
      <rect x="642" y="537" width="64" height="55" fill="#e3d0a9" stroke="#a99472" strokeWidth="1" />
      <path d="M642 554H706M642 572H706M672 546H679M672 563H679M672 581H679" stroke="#b09c78" strokeWidth=".9" />
      <use href={`#${plant}`} transform="translate(690 513) scale(1.1)" />
      <path d="M653 520H664L663 536H654Z" fill="#e9dec2" stroke="#b5a886" strokeWidth=".8" />
      <path d="M658 520V509M658 513L653 508" stroke="#a9ad85" strokeWidth="1.3" />
    </g>

    {/* Window, reveals and the external awning. */}
    <path d="M714 293L727 283V364H714Z" fill="#dce9e9" fillOpacity=".55" stroke="#8b9c9e" strokeWidth=".9" />
    <path d="M715 379H729V519H715Z" fill="#edf7f6" stroke="#5b7c82" strokeWidth="1.1" />
    <path d="M720 380V518M714 391H729M714 508H729" stroke="#8bacb1" strokeWidth=".7" />
    <path d="M716 520H730V533H716Z" fill="#e0d8c5" stroke="#738589" strokeWidth=".8" />
    {(!contributors || contributors.externalShade) && <>
    <path d="M731 309L829 349L825 356L731 317Z" fill="#d8e4e6" stroke="#526e79" strokeWidth="1.3" />
    <path d="M746 322L812 350L796 408L733 378Z" fill="#b6c7c9" opacity=".48" />
    <path d="M746 327L738 367M761 332L752 377M778 338L766 383M794 345L782 392M809 351L796 400" stroke="#94acb0" strokeWidth=".75" opacity=".8" />
    <path d="M738 391L807 418" stroke="#aab6ab" strokeDasharray="4 5" opacity=".6" />
    </>}

    {/* Timber floor details. */}
    <g stroke="#b5a084" strokeWidth=".65" opacity=".7"><path d="M219 598H740M220 604H740M258 592L250 609M355 592L350 609M453 592L451 609M552 592L555 609M650 592L657 609" /></g>
    <path d="M217 609H741" stroke="#27302b" strokeWidth="1.5" />

    {/* Quiet roof heat cues. */}
    {(!contributors || contributors.roof) && <g stroke="#ec9c30" strokeWidth="1.6" strokeLinecap="round">
      <path d="M541 118C559 96 529 93 546 70M571 135C588 112 560 108 578 86M602 155C618 133 591 125 608 106" />
    </g>}
    </g>

    {children}

    {/* Descriptive callouts are part of the illustration, not room facts. */}
    {callouts ? <g fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fill="#26343b">
      {callouts.map(callout => <g key={callout.text} transform={`translate(${callout.x} ${callout.y})`}>
        {callout.target && <path d={`M${callout.width / 2} ${callout.detail ? 72 : 46}L${callout.target[0] - callout.x} ${callout.target[1] - callout.y}`} stroke={callout.accent === "heat" ? "#c78225" : "#597d8a"} strokeWidth="1.2" />}
        <rect width={callout.width} height={callout.detail ? 72 : 46} rx="8" fill="#fffefd" stroke="#e8e4dc" strokeWidth=".8" />
        <circle cx="17" cy="23" r="5" fill={callout.accent === "heat" ? "#ffb13b" : "#597d8a"} />
        <text x="31" y="29">{callout.text}</text>
        {callout.detail && <text x="31" y="52" fontSize="13" fill="#59666c">{callout.detail}</text>}
      </g>)}
    </g> : <g fontFamily="Arial, Helvetica, sans-serif" fontSize="17" fill="#26343b">
      <rect x="281" y="140" width="124" height="42" rx="10" fill="#fffefd" stroke="#e8e4dc" strokeWidth=".8" />
      <circle cx="300" cy="161" r="5" fill="#ffb13b" /><text x="315" y="167">Roof heat</text>
      <rect x="617" y="44" width="174" height="42" rx="10" fill="#fffefd" stroke="#e8e4dc" strokeWidth=".8" />
      <circle cx="636" cy="65" r="5" fill="#ffb13b" /><text x="651" y="71">Afternoon sun</text>
      <rect x="809" y="407" width="125" height="42" rx="10" fill="#fffefd" stroke="#e8e4dc" strokeWidth=".8" />
      <circle cx="828" cy="428" r="5" fill="#597d8a" /><text x="843" y="434">Shade here</text>
    </g>}
  </svg>;
}
