import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Player, Obstacle, Particle } from '../types';
import { 
  GRAVITY, JUMP_FORCE, INITIAL_SPEED, SPEED_INCREMENT, MAX_SPEED,
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_HEIGHT, PLAYER_SIZE, PLAYER_X_OFFSET,
  COLOR_PLAYER, COLOR_SPIKE, COLOR_BLOCK, COLOR_GROUND, COLOR_BG_TOP, COLOR_BG_BOTTOM 
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerReset: number; // Increment to force reset
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, triggerReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (Mutable for performance)
  const playerRef = useRef<Player>({
    x: PLAYER_X_OFFSET,
    y: CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    rotation: 0,
    isGrounded: true,
    color: COLOR_PLAYER
  });
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(INITIAL_SPEED);
  const frameCountRef = useRef<number>(0);
  
  // Controls when the next obstacle can spawn (relative gap)
  const nextSpawnGapRef = useRef<number>(0);

  // Audio Context for simple synthesized sounds (optional, but nice)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'jump' | 'die' | 'score') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    
    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  };

  // --- Core Game Logic ---

  const resetGame = () => {
    playerRef.current = {
      x: PLAYER_X_OFFSET,
      y: CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      dy: 0,
      rotation: 0,
      isGrounded: true,
      color: COLOR_PLAYER
    };
    obstaclesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    frameCountRef.current = 0;
    nextSpawnGapRef.current = 0; // Reset spawn timer/gap
    setScore(0);
  };

  const spawnObstacle = () => {
    // Determine spawn position (off-screen right)
    const spawnX = CANVAS_WIDTH + 100;
    
    // Calculate required gap based on speed to ensure jumpability
    // Jump duration is approx 37 frames. Distance = 37 * speed.
    // We need a gap slightly larger than jump distance to be fair.
    const jumpDistance = 40 * speedRef.current; 
    const minGap = jumpDistance * 0.8; // Minimum safe distance (variable)
    const maxGap = jumpDistance * 1.5; // Max distance
    
    const lastObs = obstaclesRef.current[obstaclesRef.current.length - 1];

    // If no obstacles, spawn one immediately (or if array is empty)
    if (!lastObs) {
      createObstacleBatch(spawnX);
      nextSpawnGapRef.current = Math.random() * (maxGap - minGap) + minGap;
      return;
    }

    // Check if the last obstacle has moved far enough left to satisfy the gap
    const currentGap = spawnX - (lastObs.x + lastObs.width);
    
    if (currentGap >= nextSpawnGapRef.current) {
      createObstacleBatch(spawnX);
      nextSpawnGapRef.current = Math.random() * (maxGap - minGap) + minGap;
    }
  };

  const createObstacleBatch = (baseX: number) => {
    const typeRoll = Math.random();
    let newObstacles: Obstacle[] = [];

    if (typeRoll < 0.4) {
      // Single Spike
      newObstacles.push({
        id: Date.now() + Math.random(),
        x: baseX,
        y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
        width: 40,
        height: 40,
        type: 'SPIKE',
        passed: false
      });
    } else if (typeRoll < 0.7) {
      // Double Spike
      newObstacles.push({
        id: Date.now() + Math.random(),
        x: baseX,
        y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
        width: 40,
        height: 40,
        type: 'SPIKE',
        passed: false
      }, {
        id: Date.now() + Math.random() + 1,
        x: baseX + 40,
        y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
        width: 40,
        height: 40,
        type: 'SPIKE',
        passed: false
      });
    } else if (typeRoll < 0.85) {
      // Block
      newObstacles.push({
        id: Date.now() + Math.random(),
        x: baseX,
        y: CANVAS_HEIGHT - GROUND_HEIGHT - 50,
        width: 50,
        height: 50,
        type: 'BLOCK',
        passed: false
      });
    } else {
        // Triple Spike (Hard)
        newObstacles.push({
            id: Date.now() + Math.random(),
            x: baseX,
            y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
            width: 40,
            height: 40,
            type: 'SPIKE',
            passed: false
          }, {
            id: Date.now() + Math.random() + 1,
            x: baseX + 40,
            y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
            width: 40,
            height: 40,
            type: 'SPIKE',
            passed: false
          }, {
            id: Date.now() + Math.random() + 2,
            x: baseX + 80,
            y: CANVAS_HEIGHT - GROUND_HEIGHT - 40,
            width: 40,
            height: 40,
            type: 'SPIKE',
            passed: false
          });
    }

    obstaclesRef.current.push(...newObstacles);
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 5 + 2
      });
    }
  };

  const checkCollision = (p: Player, o: Obstacle): boolean => {
    // Shrink hitbox slightly for forgiveness
    const padding = 10;
    
    // Triangle Hitbox approximation (for spikes)
    if (o.type === 'SPIKE') {
        const pLeft = p.x + padding;
        const pRight = p.x + p.width - padding;
        const pTop = p.y + padding;
        const pBottom = p.y + p.height - padding;

        const oLeft = o.x + padding;
        const oRight = o.x + o.width - padding;
        const oTop = o.y + padding;
        const oBottom = o.y + o.height; 

        return (
            pLeft < oRight &&
            pRight > oLeft &&
            pTop < oBottom &&
            pBottom > oTop
        );
    } 
    
    // Box Hitbox (Player vs Block)
    return (
      p.x + padding < o.x + o.width - padding &&
      p.x + p.width - padding > o.x + padding &&
      p.y + padding < o.y + o.height - padding &&
      p.y + p.height - padding > o.y + padding
    );
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;

    const player = playerRef.current;
    frameCountRef.current++;

    // Speed scaling
    if (speedRef.current < MAX_SPEED) {
      speedRef.current += SPEED_INCREMENT;
    }

    // Player Physics
    player.dy += GRAVITY;
    player.y += player.dy;

    // Ground Collision
    const groundLevel = CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE;
    if (player.y > groundLevel) {
      player.y = groundLevel;
      player.dy = 0;
      player.isGrounded = true;
      
      // Snap rotation to nearest 90 on ground
      const remainder = player.rotation % 90;
      if (remainder !== 0) {
        if (remainder > 45) player.rotation += (90 - remainder) * 0.2;
        else player.rotation -= remainder * 0.2;
      }
    } else {
      player.isGrounded = false;
      player.rotation += 5; // Rotate while in air
    }

    // Spawn Obstacles
    spawnObstacle();

    // Update Obstacles
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obs = obstaclesRef.current[i];
      obs.x -= speedRef.current;

      // Score counting
      if (!obs.passed && obs.x + obs.width < player.x) {
        obs.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current); // Sync to React State occasionally
      }

      // Cleanup off-screen
      if (obs.x + obs.width < -100) {
        obstaclesRef.current.splice(i, 1);
        continue;
      }

      // Collision
      if (checkCollision(player, obs)) {
        createExplosion(player.x + player.width/2, player.y + player.height/2, player.color);
        playSound('die');
        setGameState(GameState.GAME_OVER);
      }
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      p.size *= 0.95;
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background Gradient (Dynamic)
    const hue = (frameCountRef.current / 5) % 360;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, COLOR_BG_TOP);
    gradient.addColorStop(1, `hsl(${hue}, 40%, 20%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid / Parallax Effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    const gridOffset = (frameCountRef.current * (speedRef.current * 0.5)) % 100;
    for (let x = -gridOffset; x < CANVAS_WIDTH; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // --- Billy Parker-Newton Text ---
    ctx.save();
    ctx.font = 'bold 80px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; // Subtle background text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(-10 * Math.PI / 180); // Slight rotation for style
    ctx.fillText('Billy Parker-Newton', 0, 0);
    ctx.restore();
    // --------------------------------

    // Floor
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    // Floor Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);
    ctx.stroke();

    // Obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.shadowBlur = 15;
      if (obs.type === 'SPIKE') {
        ctx.fillStyle = COLOR_SPIKE;
        ctx.shadowColor = COLOR_SPIKE;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height); // Bottom Left
        ctx.lineTo(obs.x + obs.width / 2, obs.y); // Top Middle
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height); // Bottom Right
        ctx.closePath();
        ctx.fill();
        
        // Inner detail
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(obs.x + 10, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + 15);
        ctx.lineTo(obs.x + obs.width - 10, obs.y + obs.height);
        ctx.fill();

      } else {
        ctx.fillStyle = COLOR_BLOCK;
        ctx.shadowColor = COLOR_BLOCK;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        
        // Block Border
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }
      ctx.shadowBlur = 0;
    });

    // Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Player
    if (gameState !== GameState.GAME_OVER) {
        const p = playerRef.current;
        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        ctx.rotate((p.rotation * Math.PI) / 180);
        
        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        
        // Main Body
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        
        // Face/Inner Detail
        ctx.fillStyle = '#000';
        ctx.fillRect(-p.width / 4, -p.height / 4, p.width / 2, p.height / 2);
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
  };

  const loop = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    update();
    draw(ctx);
    requestRef.current = requestAnimationFrame(loop);
  };

  // Input Handling
  const jump = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      if (playerRef.current.isGrounded) {
        playerRef.current.dy = JUMP_FORCE;
        playerRef.current.isGrounded = false;
        playSound('jump');
        
        // Dust particles
        for(let i=0; i<5; i++) {
             particlesRef.current.push({
                id: Math.random(),
                x: playerRef.current.x + Math.random() * playerRef.current.width,
                y: playerRef.current.y + playerRef.current.height,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() * -2),
                life: 0.5,
                maxLife: 0.5,
                color: 'white',
                size: 3
             });
        }
      }
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    
    // Mouse/Touch handlers are on the div in App.tsx for better capture
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // Game Loop Lifecycle
  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]); // Restart loop if gamestate changes

  // Handle Reset
  useEffect(() => {
    resetGame();
  }, [triggerReset]);

  // To support click-anywhere, we attach the listener to window in the effect above
  useEffect(() => {
      const handleInput = (e: Event) => {
          // Check if target is button, if so ignore
          if ((e.target as HTMLElement).tagName === 'BUTTON') return;
          if (gameState === GameState.PLAYING) {
             // e.preventDefault(); // Prevent default touch actions
             initAudio();
             jump();
          }
      };
      
      window.addEventListener('mousedown', handleInput);
      window.addEventListener('touchstart', handleInput, { passive: false });
      
      return () => {
          window.removeEventListener('mousedown', handleInput);
          window.removeEventListener('touchstart', handleInput);
      };
  }, [gameState, jump]);


  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-cover"
    />
  );
};

export default GameCanvas;