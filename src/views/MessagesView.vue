<template>
  <ComingSoon
    icon="💬"
    title="Μηνύματα"
    description="Στείλε ιδιωτικά μηνύματα σε άλλους παίκτες, κάνε διαπραγματεύσεις ή απειλές!"
    :features="[
      { icon: '✉️', text: 'Ιδιωτικά μηνύματα' },
      { icon: '👥', text: 'Ομαδικές συνομιλίες' },
      { icon: '🔔', text: 'Ειδοποιήσεις σε πραγματικό χρόνο' },
      { icon: '📎', text: 'Αποστολή αντικειμένων & χρημάτων' }
    ]"
  />
</template>

<script setup>
import ComingSoon from '../components/ui/ComingSoon.vue'
</script>
