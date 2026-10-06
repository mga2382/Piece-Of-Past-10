const S = {
  levels: [],
  i: 0,
  found: new Set(),
  sel: [],
  drag: false
};

const $ = id =>
  document.getElementById(id);

const board =
  $("wordBoard");

const circle =
  $("letterCircle");

const canvas =
  $("pathCanvas");

const ctx =
  canvas.getContext("2d");


async function init() {

  const response =
    await fetch("../data/levels.json");

  const data =
    await response.json();

  S.levels =
    data.levels;

  render();

  addEventListener(
    "resize",
    resize
  );
}


function lv() {
  return S.levels[S.i];
}


function all() {

  return [
    3,
    4,
    5,
    6
  ].flatMap(
    n => lv().words[n] || []
  );
}


function render() {

  S.found.clear();

  S.sel = [];

  $("levelNumber").textContent =
    lv().id;

  board.innerHTML = "";


  [3, 4, 5, 6].forEach(n => {

    (lv().words[n] || [])
      .forEach(word => {

        const row =
          document.createElement("div");

        row.className =
          "row";

        row.dataset.word =
          word;


        word.split("")
          .forEach((letter, index) => {

            const slot =
              document.createElement("div");

            slot.className =
              "slot";

            slot.textContent =
              index ? "•" : letter;

            if (index) {

              slot.style.color =
                "transparent";
            }

            row.appendChild(slot);
          });


        board.appendChild(row);
      });
  });


  let letters =
    [...lv().letters];


  for (
    let i = letters.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      letters[i],
      letters[j]
    ] =
    [
      letters[j],
      letters[i]
    ];
  }


  circle.innerHTML = "";


  const r =
    circle.getBoundingClientRect();

  const cx =
    r.width / 2;

  const cy =
    r.height / 2;

  const radius =
    Math.min(
      r.width,
      r.height
    ) * 0.36;


  letters.forEach(
    (letter, index) => {

      const angle =
        -Math.PI / 2 +
        index *
        2 *
        Math.PI /
        letters.length;


      const element =
        document.createElement("div");

      element.className =
        "letter";

      element.textContent =
        letter;


      element.style.left =
        cx +
        Math.cos(angle) *
        radius +
        "px";

      element.style.top =
        cy +
        Math.sin(angle) *
        radius +
        "px";


      element.onpointerdown =
        start;


      circle.appendChild(
        element
      );
    }
  );


  update();

  resize();

  msg("");
}


function start(event) {

  event.preventDefault();

  S.drag = true;

  S.sel = [];

  add(
    event.currentTarget
  );


  addEventListener(
    "pointermove",
    move,
    {
      passive: false
    }
  );


  addEventListener(
    "pointerup",
    end,
    {
      once: true
    }
  );
}


function move(event) {

  if (!S.drag)
    return;

  event.preventDefault();


  const target =
    document
      .elementFromPoint(
        event.clientX,
        event.clientY
      )
      ?.closest?.(".letter");


  if (target) {

    add(target);
  }


  draw(
    event.clientX,
    event.clientY
  );
}


function add(element) {

  if (
    S.sel.includes(element)
  )
    return;


  S.sel.push(element);

  element.classList.add(
    "active"
  );


  $("formedWord").textContent =
    S.sel
      .map(
        x => x.textContent
      )
      .join("");


  draw();
}


function end() {

  S.drag = false;


  removeEventListener(
    "pointermove",
    move
  );


  const word =
    S.sel
      .map(
        x => x.textContent
      )
      .join("");


  if (word)
    submit(word);


  S.sel.forEach(
    element =>
      element.classList.remove(
        "active"
      )
  );


  S.sel = [];

  clear();


  $("formedWord")
    .innerHTML = "&nbsp;";
}


function submit(word) {

  if (!all().includes(word)) {

    msg(
      "Bu kelime listede yok."
    );

    return;
  }


  if (S.found.has(word)) {

    msg(
      "Bu kelime zaten bulundu."
    );

    return;
  }


  S.found.add(word);


  const row =
    board.querySelector(
      `[data-word="${CSS.escape(word)}"]`
    );


  [...row.children]
    .forEach(
      (slot, index) => {

        slot.textContent =
          word[index];

        slot.style.color =
          "#fff";
      }
    );


  update();


  if (
    S.found.size ===
    all().length
  ) {

    msg(
      "Bölüm tamamlandı!"
    );

  } else {

    msg("Doğru!");
  }
}


function update() {

  const total =
    all().length;


  $("progressText")
    .textContent =
    `${S.found.size} / ${total}`;


  $("progressFill")
    .style.width =
    100 *
    S.found.size /
    total +
    "%";
}


function msg(text) {

  $("message")
    .textContent =
    text;
}


function resize() {

  const r =
    canvas.getBoundingClientRect();

  const d =
    devicePixelRatio || 1;


  canvas.width =
    r.width * d;

  canvas.height =
    r.height * d;


  ctx.setTransform(
    d,
    0,
    0,
    d,
    0,
    0
  );


  clear();
}


function point(element) {

  const a =
    element.getBoundingClientRect();

  const c =
    canvas.getBoundingClientRect();


  return {
    x:
      a.left +
      a.width / 2 -
      c.left,

    y:
      a.top +
      a.height / 2 -
      c.top
  };
}


function draw(
  pointerX,
  pointerY
) {

  clear();


  if (!S.sel.length)
    return;


  ctx.strokeStyle =
    "#ffffffbf";

  ctx.lineWidth = 5;

  ctx.lineCap =
    "round";


  ctx.beginPath();


  S.sel.forEach(
    (element, index) => {

      const p =
        point(element);


      if (index) {

        ctx.lineTo(
          p.x,
          p.y
        );

      } else {

        ctx.moveTo(
          p.x,
          p.y
        );
      }
    }
  );


  if (
    pointerX != null
  ) {

    const r =
      canvas.getBoundingClientRect();


    ctx.lineTo(
      pointerX - r.left,
      pointerY - r.top
    );
  }


  ctx.stroke();
}


function clear() {

  const r =
    canvas.getBoundingClientRect();


  ctx.clearRect(
    0,
    0,
    r.width,
    r.height
  );
}


$("shuffleBtn")
  .onclick =
  render;


$("clearBtn")
  .onclick =
  () => {

    S.sel.forEach(
      element =>
        element.classList.remove(
          "active"
        )
    );

    S.sel = [];

    clear();

    $("formedWord")
      .innerHTML = "&nbsp;";
  };


$("prevBtn")
  .onclick =
  () => {

    if (S.i > 0) {

      S.i--;

      render();
    }
  };


$("nextBtn")
  .onclick =
  () => {

    if (
      S.i <
      S.levels.length - 1
    ) {

      S.i++;

      render();
    }
  };


init();
