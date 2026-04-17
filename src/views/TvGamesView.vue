<template>
  <div class="tvgames-page">
    <h2 class="page-title">📺 Τηλεπαιχνίδια</h2>
    <p class="page-sub text-muted">Παίξε τηλεπαιχνίδια και κέρδισε μεγάλα ποσά!</p>

    <div class="games-grid">
      <div class="card game-card coming">
        <div class="game-icon">💰</div>
        <div class="game-name">Εκατομμυριούχος</div>
        <div class="game-desc text-muted">15 ερωτήσεις γενικής γνώσης. Φτάσε στο €1.000.000!</div>
        <div class="coming-badge">Σύντομα</div>
      </div>

      <div class="card game-card coming">
        <div class="game-icon">🎯</div>
        <div class="game-name">Plingo</div>
        <div class="game-desc text-muted">Ρίξε μπάλες και κέρδισε πολλαπλασιαστές!</div>
        <div class="coming-badge">Σύντομα</div>
      </div>

      <div class="card game-card coming">
        <div class="game-icon">🎡</div>
        <div class="game-name">Τροχός της Τύχης</div>
        <div class="game-desc text-muted">Γύρισε τον τροχό και δες τι κερδίζεις!</div>
        <div class="coming-badge">Σύντομα</div>
      </div>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.tvgames-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.page-title { font-size: var(--font-size-2xl); margin-bottom: 2px; }
.page-sub { font-size: var(--font-size-xs); margin: 0; }

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-md);
}

.game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.game-card.coming {
  opacity: 0.7;
  cursor: default;
}

.game-icon { font-size: 3rem; line-height: 1; }
.game-name { font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }
.game-desc { font-size: var(--font-size-xs); line-height: 1.4; }

.coming-badge {
  margin-top: var(--space-xs);
  padding: 3px 12px;
  background: rgba(79,195,247,0.12);
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  font-weight: var(--font-weight-bold);
}
</style>
