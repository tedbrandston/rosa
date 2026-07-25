const NOT_STARTED = "not started";
const RUNNING = "running";
const STOPPED = "stopped";

const EASY = "easy";
const MEDIUM = "medium";
const HARD = "hard";
const DIFFICULTY_BTNS = new Map();
const DIFFICULTY_BTN_RADIUS = 55;

const GAME_STATE = {
  "difficulty": MEDIUM,
};

let snake = []
let CURRENT_DIR = null;
let JUST_TURNED = false;

let FOOD = new Map();
const FOOD_CHANCE = 0.01;

const POSITIONS_WIDE = 30;
const POSITIONS_HIGH = 30;
const SEGMENT_DIAMETER = 20;

let MANGO_COLOR, MANGO_MASK;

const MANGO = "mango";
const BALONEY = "baloney";
const BLOCK = "block";

function preload() {
  MANGO_COLOR = loadImage("assets/mango.png");
  MANGO_MASK = loadImage("assets/mango-mask.png");
  
  SELECTED_BTN_MANGO = loadImage("assets/mango-button-selected.png")
  UNSELECTED_BTN_MANGO = loadImage("assets/mango-button-unselected.png")
}

function makeDifficultyButtons() {
  let position = 1;
  for (let difficulty of [EASY, MEDIUM, HARD]) {
    const btn = {};
    btn.x = width/4*position;
    btn.y = height/6;
    
    DIFFICULTY_BTNS.set(difficulty, btn);
    position += 1;
  }
}

function resetGame() {
  GAME_STATE.state = NOT_STARTED;
  GAME_STATE.score = 0;
  
  snake = [];
  addSegment(POSITIONS_WIDE/2, POSITIONS_HIGH/2);
  CURRENT_DIR = null;
  JUST_TURNED = false;
  
  let num_mangos = 10;
  let num_baloney = 0;
  let frame_rate = 0
  switch (GAME_STATE.difficulty) {
    case EASY:
      num_baloney = 3;
      frame_rate = 10;
      break;
    case MEDIUM:
      num_baloney = 5;
      frame_rate = 15;
      break;
    case HARD:
      num_baloney = 10;
      frame_rate = 20;
      break;
  }
  FOOD = new Map();
  Array(num_mangos).keys().forEach(() => addFood([MANGO]));
  Array(num_baloney).keys().forEach(() => addFood([BALONEY]));
  
  setUpSpeech();
  
  frameRate(frame_rate);
}

function setup() {
  createCanvas(POSITIONS_WIDE*SEGMENT_DIAMETER, POSITIONS_HIGH*SEGMENT_DIAMETER);
  rectMode(CENTER);
  imageMode(CENTER);
  
  makeDifficultyButtons();
  
  resetGame();
}

function draw() {
  if (GAME_STATE.state === RUNNING) {
    maybeAddFood();
    updateSnakePosition();
    fadeFood();

    checkSelfCollision();
    checkEatFood();
  }
  
  background(20, 10, 25);
  drawFood();
  drawSnake();
  drawHUD();
  drawSpeech();
  
  if (GAME_STATE.state === NOT_STARTED) {
    drawDifficultyButtons();
  }
}

function setUpSpeech() {
  GAME_STATE.speech = {};
  GAME_STATE.speech.visible = true;
  GAME_STATE.speech.wiggle = false;
  GAME_STATE.speech.content = "Press arrow key to start!";
}

function keyFor(px, py) {
  return `${px},${py}`;
}

function xyFor(p) {
  return p*SEGMENT_DIAMETER + SEGMENT_DIAMETER/2;
}

function mangoColor() {
  return color(random(128) + 128, random(128) + 64, 0);
}

function colorFromMango(img) {
  // TODO: grab average mango color
  return mangoColor();
}

function makeMango() {
  let x = floor(random(MANGO_COLOR.width - MANGO_MASK.width));
  let y = floor(random(MANGO_COLOR.height - MANGO_MASK.height));
  let color_img = MANGO_COLOR.get(x, y, MANGO_MASK.width, MANGO_MASK.height);
  color_img.mask(MANGO_MASK);
  
  return color_img;
}

function startFadingOpposite(opposite_type) {
  // TODO: do blocks get involved here?
  let fade_type;
  switch (opposite_type) {
    case MANGO:
      fade_type = BALONEY;
      break;
    case BALONEY:
      fade_type = MANGO;
      break;
    case BLOCK:
      // Early exit
      return;
  }
  
  let hit = FOOD.values().find((food) => {
    return food.type === fade_type && food.fade === null;
  });
  if (hit) {
    hit.fade = 255;
  }
}

function addFood(type_options) {
  if (!type_options) {
    // Equal chance to pick any;
    type_options = [MANGO, BALONEY, BLOCK]
  }

  const px = floor(random(POSITIONS_WIDE));
  const py = floor(random(POSITIONS_HIGH));
  const pos_key = keyFor(px, py);
  
  if (FOOD.has(pos_key)) {
    // There's already food here, try a new location;
    return addFood(type_options);
  }
  
  type = type_options[floor(random(type_options.length))];
  
  let food_image;
  if (type === MANGO) {
    food_image = makeMango();
  };
  
  let value = 0;
  if (type === BLOCK) {
    value = round(random(10)) + max(0, snake.length - 10);
  }
    
  FOOD.set(pos_key, {
    "px": px,
    "py": py,
    "type": type,
    "food_image": food_image,
    "fade": null,
    "value": value,
  });
  
  return type;
}

function edibleFood() {
  for (const food of FOOD.values()) {
    if (food.type === MANGO || food.type === BLOCK) {
      return true;
    }
}
  // for (let food in FOOD.values()) {
  // }
  return false;
}

function maybeAddFood() {
  if(!edibleFood()) {
    addFood([MANGO, BLOCK]);
  } else if (random() < FOOD_CHANCE) {
    const type = addFood();
    startFadingOpposite(type);
  }
}

function addSegment(px, py, mango) {
  snake.push({
    "px": px, 
    "py": py, 
    "color": mango || mangoColor(),
  });
}

function thoughtBubble(from_x, from_y, contents, wiggle) {
  let invert_x = from_x > width - 200; //TODO
  let invert_y = from_y < 200;
    
  stroke(0);
  fill(255);
  [
    [20, 20, 10],
    [35, 35, 20],
    [50, 65, 35],
  ].forEach((xyr) => {
    [x, y, r] = xyr;
    if (invert_x) x *= -1; 
    if (invert_y) y *= -1; 
    ellipse(from_x + x, from_y - y, r);
  })
  
  let x_off = 90;
  let y_off = -125;
  if (invert_x) x_off *= -1;
  if (invert_y) y_off *= -1;
  
  let w = 50;
  let h = 25;
  fill(255);
  textAlign(CENTER, CENTER);
  for (let r = -PI; r < PI; r += PI/5) {
    ellipse(from_x + x_off + cos(r)*w, from_y + y_off + sin(r)*h, 35, 35);
  }
  noStroke();
  ellipse(from_x + x_off, from_y + y_off, w*2 + 30, h*2 + 16);
  fill(0);
  if (wiggle) {
    let lx = contents.length*-4.5;
    for (let i = 0; i < contents.length; i++) {
      lx += 9;
      text(contents[i], from_x + x_off + lx + random(3), from_y + y_off + random(3));
    };
  } else {
    text(contents, from_x + x_off, from_y + y_off);
  }
}

function drawSnake() {
  noStroke();
  snake.forEach((segment) => {
    fill(segment.color);
    ellipse(
      xyFor(segment.px), xyFor(segment.py), 
      SEGMENT_DIAMETER, SEGMENT_DIAMETER);
  });
}

function drawFood() {
  FOOD.values().forEach((food) => {
    const fade = food.fade || 255;
    
    switch (food.type) {
      case MANGO:
        tint(255, fade);
        image(food.food_image, xyFor(food.px), xyFor(food.py));
        noTint();
        break;
      case BALONEY:
        stroke(139,69,19, fade);
        fill(221, 167, 155, fade);
        ellipse(
          xyFor(food.px), xyFor(food.py), 
          SEGMENT_DIAMETER+2, SEGMENT_DIAMETER+2);
        noStroke();
        break;
      case BLOCK:
        noStroke();
        fill(128);
        rect(
          xyFor(food.px), xyFor(food.py),
          SEGMENT_DIAMETER, SEGMENT_DIAMETER,
          3);
        stroke(0);
        fill(255);
        textAlign(CENTER, CENTER);
        text(food.value, xyFor(food.px), xyFor(food.py));
        return;
    }
  });
}

function drawHUD() {
  noStroke();
  fill(255);
  textAlign(LEFT);
  text(`Score: ${GAME_STATE.score}`, 5, 10);
  textAlign(RIGHT);
  text(`Length: ${snake.length}`, width-5 , 10);
}

function drawSpeech() {
  if (GAME_STATE.speech.visible) {
    thoughtBubble(
      xyFor(snake[0].px), 
      xyFor(snake[0].py), 
      GAME_STATE.speech.content, 
      GAME_STATE.speech.wiggle);
  }
}

function drawButton(selected, txt, x, y) {
  let img = null;
  if (selected) {
    img = SELECTED_BTN_MANGO;
  } else {
    img = UNSELECTED_BTN_MANGO;
  }
  if (dist(mouseX, mouseY, x, y) < DIFFICULTY_BTN_RADIUS) {
    noFill();
    for (i = 60; i < DIFFICULTY_BTN_RADIUS*2; i++){
      stroke(i+100, i+100, 0);
      ellipse(x, y, i, i);
    }
  }
  image(img, x, y);
  noStroke();
  fill(0);
  text(txt, x, y);
}

function drawDifficultyButtons() {
  drawButton(GAME_STATE.difficulty === EASY, "Easy", width/4, height/6);
  drawButton(GAME_STATE.difficulty === MEDIUM, "Medium", width/4*2, height/6);
  drawButton(GAME_STATE.difficulty === HARD, "Hard", width/4*3, height/6);
}

function updateSnakePosition() {
  if (CURRENT_DIR == null || GAME_STATE.state !== RUNNING) {
    return;
  }
  // Shift each segment, from the last to the first, forward to where the next segment is   
  for (let index = snake.length - 1; index > 0; index--) {
    const next = index-1;
    snake[index].px = snake[next].px;
    snake[index].py = snake[next].py;
  }
  
  if (CURRENT_DIR === LEFT_ARROW) {
    snake[0].px -= 1;
  } else if (CURRENT_DIR === UP_ARROW) {
    snake[0].py -= 1;
  } else if (CURRENT_DIR === RIGHT_ARROW) {
    snake[0].px += 1;
  } else if (CURRENT_DIR === DOWN_ARROW) {
    snake[0].py += 1;
  }
  
  if (snake[0].px >= POSITIONS_WIDE) {
    snake[0].px -= POSITIONS_WIDE;
  } else if (snake[0].px < 0) {
    snake[0].px += POSITIONS_WIDE;
  }
  if (snake[0].py >= POSITIONS_HIGH) {
    snake[0].py -= POSITIONS_HIGH;
  } else if (snake[0].py < 0) {
    snake[0].py += POSITIONS_HIGH;
  }
  
  JUST_TURNED = false;
}

function fadeFood() {
  FOOD.values().forEach((food) => {
    if (food.fade != null) {
      if (food.fade <= 1) {
        FOOD.delete(keyFor(food.px, food.py));
      } else {
        food.fade -= 1;
      }
    }
  });
}

function endGame(content, wiggle) {
  GAME_STATE.state = STOPPED;
  GAME_STATE.speech.content = content;
  GAME_STATE.speech.visible = true;
  GAME_STATE.speech.wiggle = wiggle;
  
  setTimeout(resetGame, 5000);
}

function checkSelfCollision() {
  const original_length = snake.length;
  const locations = snake.map((segment) => keyFor(segment.px, segment.py));
  const new_length = (new Set(locations)).size;
  if (new_length < original_length) {
    print("collision!");
    endGame("OW!", false);
  }
}

function checkEatFood() {
  const pos_key = keyFor(snake[0].px, snake[0].py);
  
  const hit = FOOD.get(pos_key);
  if (hit) {
    switch (hit.type) {
      case MANGO:
        addSegment(hit.px, hit.py, colorFromMango(hit.food_image));
        FOOD.delete(pos_key);
        break;
      case BLOCK:
        if (snake.length >= hit.value) {
          GAME_STATE.score += hit.value;
          addSegment(hit.px, hit.py, color(128));
          FOOD.delete(pos_key);
        } else {
          endGame("Oof!", false);
        }
        break;  
      case BALONEY:
        endGame("NO BALONEY!", true);
        break;
    }
  }
}

function turn(dir) {
  CURRENT_DIR = dir;
  JUST_TURNED = true;
}

function mouseClicked(evt) {
  DIFFICULTY_BTNS.forEach((btn, difficulty) => {
    if (dist(mouseX, mouseY, btn.x, btn.y) < DIFFICULTY_BTN_RADIUS && GAME_STATE.difficulty !== difficulty) {
      GAME_STATE.difficulty = difficulty;
      resetGame();
    }
  });
}

function keyPressed() {
  if (JUST_TURNED) {
    return;
  }
  
  if (keyCode === LEFT_ARROW && CURRENT_DIR != RIGHT_ARROW) {
    turn(keyCode);
  } else if (keyCode === UP_ARROW && CURRENT_DIR != DOWN_ARROW) {
    turn(keyCode);
  } else if (keyCode === RIGHT_ARROW && CURRENT_DIR != LEFT_ARROW) {
    turn(keyCode);
  } else if (keyCode === DOWN_ARROW && CURRENT_DIR != UP_ARROW) {
    turn(keyCode);
  }
  if (GAME_STATE.state === NOT_STARTED && CURRENT_DIR != null) {
    GAME_STATE.speech.visible = false;
    GAME_STATE.state = RUNNING;
  }
}
