export default function MarinaScene() {
  return (
    <svg
      className="marina-scene"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Animated illustration of waves rolling onto Chennai's Marina Beach"
    >
      <defs>
        <linearGradient id="marina-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#122c50" />
          <stop offset=".48" stopColor="#e58d72" />
          <stop offset="1" stopColor="#f3c391" />
        </linearGradient>
        <linearGradient id="marina-sea" x1="0" y1="0" x2=".12" y2="1">
          <stop offset="0" stopColor="#287f91" />
          <stop offset=".38" stopColor="#176578" />
          <stop offset="1" stopColor="#103e54" />
        </linearGradient>
        <linearGradient id="marina-sand" x1=".15" y1="0" x2=".75" y2="1">
          <stop offset="0" stopColor="#e9c59c" />
          <stop offset=".4" stopColor="#d9ae7f" />
          <stop offset="1" stopColor="#c99464" />
        </linearGradient>
        <linearGradient id="marina-wet-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfbd98" stopOpacity=".92" />
          <stop offset="1" stopColor="#d9ae7f" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="marina-sun-glow">
          <stop offset="0" stopColor="#ffe7b5" stopOpacity=".82" />
          <stop offset=".34" stopColor="#ffd4a2" stopOpacity=".27" />
          <stop offset="1" stopColor="#ffd4a2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="marina-shade" x1="0" y1="0" x2="1" y2=".2">
          <stop offset="0" stopColor="#061527" stopOpacity=".7" />
          <stop offset=".58" stopColor="#092238" stopOpacity=".25" />
          <stop offset="1" stopColor="#092238" stopOpacity=".12" />
        </linearGradient>
        <filter id="marina-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <filter id="marina-soften" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <path fill="url(#marina-sky)" d="M0 0h1600v1000H0z" />
      <circle cx="1040" cy="390" r="250" fill="url(#marina-sun-glow)" filter="url(#marina-soft-glow)" />
      <circle cx="1040" cy="390" r="65" fill="#ffddb0" opacity=".82" />

      <g className="marina-cloud marina-cloud-back" fill="#ffe0c2" opacity=".2">
        <ellipse cx="345" cy="278" rx="125" ry="17" />
        <ellipse cx="405" cy="268" rx="70" ry="19" />
        <ellipse cx="1235" cy="300" rx="150" ry="15" />
        <ellipse cx="1295" cy="291" rx="82" ry="18" />
      </g>
      <g className="marina-cloud marina-cloud-front" fill="#fff0dd" opacity=".17">
        <ellipse cx="650" cy="330" rx="92" ry="10" />
        <ellipse cx="690" cy="323" rx="55" ry="13" />
        <ellipse cx="1450" cy="230" rx="90" ry="12" />
        <ellipse cx="1490" cy="222" rx="48" ry="14" />
      </g>

      <path fill="#2a5260" opacity=".6" d="M0 444c110-16 171 7 267-6 112-16 197 7 306-5 90-11 160 3 257-6 118-11 233 8 348-5 134-15 260 6 422-10v102H0z" />
      <path fill="#d19a78" opacity=".45" d="M0 455c130-12 196 6 316-3 120-10 231 10 349 0 141-12 240 12 376 0 182-15 328 12 559-3v76H0z" />

      <path fill="url(#marina-sea)" d="M0 450c175-12 269 10 430-1 177-12 251 6 427-2 205-10 333 12 502 0 114-8 175-6 241-10v403H0z" />
      <path fill="#d8b08c" opacity=".24" d="M800 453c183-12 291 4 418 1 155-4 268-14 382-17v387H800c123-69 151-120 62-177-81-52-136-103-77-194 33-51 48-68 15-100z" />

      <g className="marina-reflection" opacity=".24">
        <path d="M1005 451h70l150 303h-320z" fill="#ffe0ae" />
        <path d="M970 472h138l9 7H960zM930 508h216l8 8H925zM895 554h295l8 8H890zM862 612h363l9 8H857zM836 676h421l7 8H830z" fill="#fff0d1" />
      </g>
      <g className="marina-ripples" fill="none" stroke="#d1ece1" strokeLinecap="round" opacity=".22">
        <path d="M104 518q28-7 57 0m74 30q37-8 79 1m52-35q24-5 49 0m157 47q35-8 72 1m72-52q30-6 61 0m234 42q35-8 70 0m73-45q26-5 52 0m74 66q38-8 76 1M188 631q34-7 69 0m164 35q27-6 57 0m482-22q41-9 84 0m151-34q33-7 67 0" strokeWidth="2.5" />
        <path d="M40 568q21-5 42 0m282 36q24-5 49 1m247 52q30-7 62 0m134-104q24-5 49 0m159 89q26-6 53 0m215-29q21-5 43 0" strokeWidth="1.6" opacity=".75" />
      </g>

      <path fill="#debf9b" opacity=".82" d="M0 712c218-26 361-45 551-40 211 6 317 51 517 37 202-15 338-79 532-114v405H0z" />
      <path fill="url(#marina-wet-sand)" d="M0 709c218-26 361-45 551-40 211 6 317 51 517 37 202-15 338-79 532-114v191c-194 34-330 90-532 104-200 14-306-31-517-37-190-5-333 14-551 40z" />
      <path fill="url(#marina-sand)" d="M0 785c218-26 361-45 551-40 211 6 317 51 517 37 202-15 338-79 532-114v332H0z" />

      <g className="marina-wave marina-wave-far">
        <path d="M-220 618c140-43 247 21 390-8s239 9 354-5 229-20 345 6 245 11 370-13 214-14 410 5v28c-182-16-280-20-410 5s-254 35-370 8-231-17-345-2-236 23-354 2-247-33-390 7z" fill="#65b7b8" opacity=".42" />
        <path d="M-220 623c140-43 247 21 390-8s239 9 354-5 229-20 345 6 245 11 370-13 214-14 410 5" fill="none" stroke="#d5f1df" strokeWidth="8" strokeLinecap="round" opacity=".55" />
      </g>
      <g className="marina-wave marina-wave-near">
        <path d="M-180 711c152-39 242 8 382-11s262-1 376 21 209 18 355-12 278-32 442 0 221 12 405-11v47c-184 24-276 22-405-7s-296-26-442 7-241 40-355 15-234-43-376-24-230 30-382 12z" fill="#85cfca" opacity=".5" />
        <path d="M-180 711c152-39 242 8 382-11s262-1 376 21 209 18 355-12 278-32 442 0 221 12 405-11" fill="none" stroke="#f1f1d9" strokeWidth="11" strokeLinecap="round" opacity=".82" />
      </g>
      <g className="marina-wave marina-wave-shore">
        <path d="M-160 777c165-36 260 3 415-7 168-11 259 29 408 39 145 10 263-31 392-47 188-24 295 14 464 2v25c-169 12-276-26-464-2-129 16-247 57-392 47-149-10-240-50-408-39-155 10-250-29-415 7z" fill="#fff4dc" opacity=".74" />
        <path d="M-160 777c165-36 260 3 415-7 168-11 259 29 408 39 145 10 263-31 392-47 188-24 295 14 464 2" fill="none" stroke="#fffaf0" strokeWidth="7" strokeLinecap="round" opacity=".92" />
      </g>

      <g className="marina-lighthouse" transform="translate(1440 180)">
        <ellipse cx="85" cy="508" rx="79" ry="11" fill="#142b34" opacity=".22" />
        <path d="M61 511l12-176h28l13 176z" fill="#f0e9d7" />
        <path d="M67 421h40l3 42H64z" fill="#d27460" />
        <path d="M71 366h33l2 27H69z" fill="#d27460" />
        <path d="M70 342h34l-4-18H74z" fill="#29394b" />
        <path d="M66 329h43v-7H66zM71 316h33v-6H71z" fill="#e6d9c3" />
        <path d="M76 309v-18h23v18z" fill="#35465a" />
        <path d="M80 298h15v9H80z" fill="#ffd79d" />
        <path d="M74 289l13-14 14 14z" fill="#d66f5d" />
        <path d="M57 511h62l9 8H49z" fill="#394955" />
        <path d="M99 298l118-27-114 38z" fill="#ffe6ad" opacity=".13" filter="url(#marina-soften)" />
      </g>

      <g className="marina-gulls" fill="none" stroke="#283a4b" strokeWidth="2.4" strokeLinecap="round" opacity=".5">
        <path d="M300 369q13-14 26 0 13-14 26 0" />
        <path d="M375 402q9-10 18 0 9-10 18 0" />
        <path d="M470 361q7-8 14 0 7-8 14 0" />
      </g>

      <g fill="#fff3df" opacity=".54">
        <circle cx="134" cy="857" r="2" /><circle cx="246" cy="908" r="1.8" />
        <circle cx="390" cy="834" r="1.5" /><circle cx="578" cy="940" r="2" />
        <circle cx="1405" cy="886" r="2" /><circle cx="1510" cy="824" r="1.7" />
      </g>

      <path fill="url(#marina-shade)" d="M0 0h1600v1000H0z" />
    </svg>
  )
}
