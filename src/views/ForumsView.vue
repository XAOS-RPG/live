<template>
  <ComingSoon
    icon="📢"
    title="Φόρουμ"
    description="Συζήτησε στρατηγικές, βρες συμμάχους και μάθε μυστικά του παιχνιδιού!"
    :features="[
      { icon: '💬', text: 'Γενική συζήτηση' },
      { icon: '⚔️', text: 'Στρατηγικές μάχης' },
      { icon: '🏴', text: 'Ανακοινώσεις συμμοριών' },
      { icon: '🛒', text: 'Αγοραπωλησίες' }
    ]"
  />
</template>

<script setup>
import ComingSoon from '../components/ui/ComingSoon.vue'
</script>
