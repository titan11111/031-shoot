// ビームシューター - SVG原型の機体・敵・ボスをCanvasへ移植
// 色とシルエットは既存世界観（シアン自機・赤金ボス・移動色の雑魚）を優先する

const Sprites = {
    drawGlowCircle(ctx, x, y, r, color) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawHexRing(ctx, radius, stroke, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const x = Math.cos(a) * radius;
            const y = Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    },

    drawPlayer(ctx, ship, frame, opts) {
        const { alpha, shielded, invincible } = opts;
        const s = ship.width / 56;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.globalAlpha = alpha;
        ctx.scale(s, s);

        const flame = 0.82 + Math.sin(frame * 0.35) * 0.18;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(-8, 20);
        ctx.lineTo(0, 20 + 22 * flame);
        ctx.lineTo(8, 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-4, 20);
        ctx.lineTo(0, 20 + 12 * flame);
        ctx.lineTo(4, 20);
        ctx.closePath();
        ctx.fill();

        const hull = ctx.createLinearGradient(-28, -28, 28, 24);
        hull.addColorStop(0, '#7fffff');
        hull.addColorStop(0.45, '#00ffcc');
        hull.addColorStop(1, '#003344');
        ctx.fillStyle = hull;
        ctx.strokeStyle = '#00a8c8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(28, 18);
        ctx.lineTo(18, 24);
        ctx.lineTo(0, 12);
        ctx.lineTo(-18, 24);
        ctx.lineTo(-28, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(24, 14);
        ctx.moveTo(-12, 0);
        ctx.lineTo(-24, 14);
        ctx.stroke();

        ctx.fillStyle = '#12303a';
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(10, 2);
        ctx.lineTo(-10, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const core = ctx.createRadialGradient(0, -4, 1, 0, -4, 7);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.55, '#00ffff');
        core.addColorStop(1, '#003344');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, -4, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8899aa';
        ctx.fillRect(-20, -12, 3, 16);
        ctx.fillRect(17, -12, 3, 16);

        if (shielded) {
            ctx.save();
            ctx.rotate(frame * 0.02);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([12, 6, 4, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = '#7fffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.stroke();
            this.drawHexRing(ctx, 28, '#00ffff', 0.35);
            ctx.restore();
        }

        if (invincible) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    },

    drawSatellite(ctx, sat, frame) {
        ctx.save();
        ctx.translate(sat.x, sat.y);
        ctx.rotate(frame * 0.04);
        const hull = ctx.createLinearGradient(-8, -8, 8, 8);
        hull.addColorStop(0, '#ffffff');
        hull.addColorStop(1, '#888888');
        ctx.fillStyle = hull;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(8, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawEnemy(ctx, enemy) {
        const s = enemy.width / 40;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.scale(s, s);
        ctx.fillStyle = enemy.color;
        ctx.strokeStyle = '#220000';
        ctx.lineWidth = 1.6;

        switch (enemy.movement) {
            case 'zigzag':
                ctx.beginPath();
                ctx.moveTo(-15, -15);
                ctx.lineTo(15, -15);
                ctx.lineTo(20, 0);
                ctx.lineTo(0, 22);
                ctx.lineTo(-20, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#fff3a0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-12, -10);
                ctx.lineTo(-12, 5);
                ctx.moveTo(12, -10);
                ctx.lineTo(12, 5);
                ctx.stroke();
                break;
            case 'chase':
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-10, -10);
                ctx.lineTo(-18, -20);
                ctx.moveTo(10, -10);
                ctx.lineTo(18, -20);
                ctx.moveTo(-10, 10);
                ctx.lineTo(-16, 18);
                ctx.moveTo(10, 10);
                ctx.lineTo(16, 18);
                ctx.strokeStyle = enemy.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            case 'fromBottom':
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-14, -14, 28, 28);
                ctx.strokeRect(-14, -14, 28, 28);
                ctx.rotate(-Math.PI / 4);
                this.drawGlowCircle(ctx, 0, 0, 5, '#f0abfc');
                break;
            default:
                ctx.beginPath();
                ctx.moveTo(0, 18);
                ctx.lineTo(-18, -15);
                ctx.lineTo(0, -8);
                ctx.lineTo(18, -15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                this.drawGlowCircle(ctx, 0, 0, 4, '#ffffff');
                break;
        }
        ctx.restore();
    },

    drawBoss(ctx, boss, frame) {
        const isFinal = gameState.stage === 6;
        const scale = boss.width / 260;
        const rot = frame * 0.8;
        const arm = Math.sin(frame * 0.08) * 12;
        const hullTop = isFinal ? '#4b0000' : '#8B0000';
        const hullBot = isFinal ? '#110000' : '#330000';
        const accent = boss.color || (isFinal ? '#ff0000' : '#FFD700');
        const gold = isFinal ? '#ffcc00' : '#FFD700';

        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.scale(scale, scale);

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 140, 0, Math.PI * 2);
        ctx.fill();
        this.drawHexRing(ctx, 118, accent, 0.5);
        ctx.restore();

        ctx.save();
        ctx.rotate((rot * Math.PI) / 180);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.setLineDash([30, 15, 10, 15]);
        ctx.beginPath();
        ctx.arc(0, 0, 115, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 105, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const hull = ctx.createLinearGradient(0, -90, 0, 90);
        hull.addColorStop(0, hullTop);
        hull.addColorStop(0.55, hullBot);
        hull.addColorStop(1, '#220000');
        ctx.fillStyle = hull;
        ctx.strokeStyle = isFinal ? '#ff0000' : gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-130, -70);
        ctx.lineTo(-70, 50);
        ctx.lineTo(-30, 90);
        ctx.lineTo(30, 90);
        ctx.lineTo(70, 50);
        ctx.lineTo(130, -70);
        ctx.lineTo(80, -90);
        ctx.lineTo(0, -40);
        ctx.lineTo(-80, -90);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawBossArm(ctx, -85, 20 + arm, accent, gold);
        this.drawBossArm(ctx, 85, 20 - arm, accent, gold);

        ctx.fillStyle = '#0a0000';
        ctx.strokeStyle = '#FF6347';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-25, 40);
        ctx.lineTo(0, 105);
        ctx.lineTo(25, 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(0, 100);
        ctx.stroke();

        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -10, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const pulse = 0.85 + Math.sin(frame * 0.12) * 0.15;
        const core = ctx.createRadialGradient(0, -10, 4, 0, -10, 32 * pulse);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.3, gold);
        core.addColorStop(0.7, '#881337');
        core.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, -10, 32, 0, Math.PI * 2);
        ctx.fill();
        this.drawHexRing(ctx, 26, accent, 0.45);

        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-50, -40);
        ctx.lineTo(-20, -20);
        ctx.moveTo(50, -40);
        ctx.lineTo(20, -20);
        ctx.stroke();

        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(-48, 8, 10, 0, Math.PI * 2);
        ctx.arc(48, 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-48, 8, 4, 0, Math.PI * 2);
        ctx.arc(48, 8, 4, 0, Math.PI * 2);
        ctx.fill();

        this.drawBossMechanicalUpgrades(ctx, gameState.stage, frame, accent, gold);

        ctx.restore();
    },

    drawBossMechanicalUpgrades(ctx, stage, frame, accent, gold) {
        if (stage < 2) return;
        ctx.save();
        ctx.lineJoin = 'round';

        // STAGE 2: リベット付き増加装甲
        ctx.fillStyle = '#182434';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(side * 34, -62);
            ctx.lineTo(side * 78, -78);
            ctx.lineTo(side * 104, -48);
            ctx.lineTo(side * 66, -30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            for (let i = 0; i < 3; i++) {
                this.drawGlowCircle(ctx, side * (48 + i * 18), -56 - i * 4, 2.5, gold);
            }
        });

        if (stage >= 3) {
            // STAGE 3: 追従する肩部ツインキャノン
            const recoil = Math.max(0, Math.sin(frame * 0.16)) * 5;
            [-1, 1].forEach(side => {
                ctx.save();
                ctx.translate(side * 104, -44 + recoil);
                ctx.rotate(side * -0.12);
                ctx.fillStyle = '#26384d';
                ctx.strokeStyle = gold;
                ctx.lineWidth = 2;
                ctx.fillRect(-13, -35, 26, 42);
                ctx.strokeRect(-13, -35, 26, 42);
                ctx.fillStyle = '#080d16';
                ctx.fillRect(-9, -62, 7, 31);
                ctx.fillRect(3, -62, 7, 31);
                ctx.strokeStyle = accent;
                ctx.strokeRect(-9, -62, 7, 31);
                ctx.strokeRect(3, -62, 7, 31);
                ctx.restore();
            });
        }

        if (stage >= 4) {
            // STAGE 4: 回転ギアとセンサーアンテナ
            const gearRotation = frame * 0.045;
            [-1, 1].forEach(side => {
                ctx.save();
                ctx.translate(side * 72, 50);
                ctx.rotate(side * gearRotation);
                ctx.strokeStyle = accent;
                ctx.lineWidth = 4;
                for (let tooth = 0; tooth < 8; tooth++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.strokeRect(-3, -25, 6, 9);
                }
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.stroke();
                this.drawGlowCircle(ctx, 0, 0, 6, gold);
                ctx.restore();
            });
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-18, -78);
            ctx.lineTo(-32, -112);
            ctx.moveTo(18, -78);
            ctx.lineTo(32, -112);
            ctx.stroke();
            this.drawGlowCircle(ctx, -33, -114, 4, accent);
            this.drawGlowCircle(ctx, 33, -114, 4, accent);
        }

        if (stage >= 5) {
            // STAGE 5: 展開翼とミサイルポッド
            const wing = 5 + Math.sin(frame * 0.06) * 5;
            [-1, 1].forEach(side => {
                ctx.fillStyle = '#101927';
                ctx.strokeStyle = accent;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(side * 82, 38);
                ctx.lineTo(side * (142 + wing), 8);
                ctx.lineTo(side * 126, 62);
                ctx.lineTo(side * 72, 70);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 2; col++) {
                        this.drawGlowCircle(ctx, side * (101 + col * 16), 34 + row * 14, 4, '#ff6b00');
                    }
                }
            });
        }

        if (stage >= 6) {
            // STAGE 6: 最終形態。王冠状レール、補助コア、噴射炎
            ctx.strokeStyle = '#ff304f';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-62, -84);
            ctx.lineTo(-42, -126);
            ctx.lineTo(-15, -96);
            ctx.lineTo(0, -138);
            ctx.lineTo(15, -96);
            ctx.lineTo(42, -126);
            ctx.lineTo(62, -84);
            ctx.stroke();
            [-1, 1].forEach(side => {
                this.drawGlowCircle(ctx, side * 42, -18, 12, '#ff1744');
                const flame = 18 + Math.sin(frame * 0.25 + side) * 7;
                const exhaust = ctx.createLinearGradient(side * 88, 72, side * 88, 72 + flame);
                exhaust.addColorStop(0, '#ffffff');
                exhaust.addColorStop(0.35, '#00d9ff');
                exhaust.addColorStop(1, 'rgba(255,0,80,0)');
                ctx.fillStyle = exhaust;
                ctx.beginPath();
                ctx.moveTo(side * 100, 65);
                ctx.lineTo(side * 88, 72 + flame);
                ctx.lineTo(side * 76, 65);
                ctx.closePath();
                ctx.fill();
            });
        }
        ctx.restore();
    },

    drawBossArm(ctx, x, y, accent, gold) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-15, 0, 30, 50, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a0000';
        ctx.beginPath();
        ctx.moveTo(-8, 50);
        ctx.lineTo(0, 85);
        ctx.lineTo(8, 50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        this.drawGlowCircle(ctx, 0, 20, 8, gold);
        ctx.restore();
    },

    drawBullet(ctx, bullet) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = bullet.color;
        if (bullet.isEnemy) {
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.roundRect(bullet.x - 2.5, bullet.y - 8, 5, 16, 2.5);
            ctx.fill();
        }
        ctx.restore();
    },

    drawHpBar(ctx, enemy) {
        const x = enemy.x - enemy.width / 2;
        const y = enemy.y - enemy.height / 2 - 10;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, enemy.width, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y, enemy.width * (enemy.hp / enemy.maxHp), 4);
    }
};

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        this.moveTo(x + radius, y);
        this.arcTo(x + w, y, x + w, y + h, radius);
        this.arcTo(x + w, y + h, x, y + h, radius);
        this.arcTo(x, y + h, x, y, radius);
        this.arcTo(x, y, x + w, y, radius);
        this.closePath();
        return this;
    };
}
