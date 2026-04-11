import { defineStore } from 'pinia'
import { getCourseById } from '../data/courses'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

export const useEducationStore = defineStore('education', {
  state: () => ({
    completedCourses: [],  // array of course IDs
  }),

  getters: {
    isCompleted() {
      return (courseId) => this.completedCourses.includes(courseId)
    },

    canTakeCourse() {
      return (course) => {
        const player = usePlayerStore()
        if (this.completedCourses.includes(course.id)) return false
        if (player.level < course.levelRequired) return false
        if (player.cash < course.cost) return false
        if (course.prerequisite && !this.completedCourses.includes(course.prerequisite)) return false
        if (!player.canAct) return false
        return true
      }
    },

    /** Accumulated bonuses from all completed courses */
    accumulatedBonuses() {
      const bonuses = {
        crimeSuccessBonus: 0,
        crimeRewardBonus: 0,
        jailTimeReduction: 0,
        hospitalTimeReduction: 0,
        escapeBonus: 0,
        gymBonus: 0,
        salaryBonus: 0,
      }
      for (const id of this.completedCourses) {
        const course = getCourseById(id)
        if (!course) continue
        const b = course.bonuses
        if (b.crimeSuccessBonus) bonuses.crimeSuccessBonus += b.crimeSuccessBonus
        if (b.crimeRewardBonus) bonuses.crimeRewardBonus += b.crimeRewardBonus
        if (b.jailTimeReduction) bonuses.jailTimeReduction += b.jailTimeReduction
        if (b.hospitalTimeReduction) bonuses.hospitalTimeReduction += b.hospitalTimeReduction
        if (b.escapeBonus) bonuses.escapeBonus += b.escapeBonus
        if (b.gymBonus) bonuses.gymBonus += b.gymBonus
        if (b.salaryBonus) bonuses.salaryBonus += b.salaryBonus
      }
      return bonuses
    },
  },

  actions: {
    startCourse(courseId) {
      const course = getCourseById(courseId)
      if (!course) return { started: false, message: 'Άγνωστο μάθημα' }

      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (!this.canTakeCourse(course)) {
        if (this.completedCourses.includes(courseId)) return { started: false, message: 'Έχεις ήδη ολοκληρώσει αυτό το μάθημα!' }
        if (player.level < course.levelRequired) return { started: false, message: `Απαιτεί Επίπεδο ${course.levelRequired}` }
        if (player.cash < course.cost) return { started: false, message: 'Δεν έχεις αρκετά χρήματα!' }
        if (course.prerequisite && !this.completedCourses.includes(course.prerequisite)) return { started: false, message: 'Πρέπει πρώτα να ολοκληρώσεις το προαπαιτούμενο μάθημα!' }
        return { started: false, message: 'Δεν μπορείς να κάνεις κάτι τώρα!' }
      }

      // Pay tuition
      player.removeCash(course.cost)

      // Start activity
      player.startActivity({
        type: 'education',
        id: courseId,
        label: course.name,
        icon: course.icon,
        duration: course.duration,
        preRolled: {
          success: true,
          roll: 1,
          targetRoll: 100,
          courseId,
        },
      })

      gameStore.saveGame()
      return { started: true }
    },

    completeCourse(courseId) {
      const course = getCourseById(courseId)
      if (!course) return
      if (this.completedCourses.includes(courseId)) return

      const player = usePlayerStore()
      const gameStore = useGameStore()

      this.completedCourses.push(courseId)

      // Apply one-time bonuses (stats, maxHP, meson)
      const b = course.bonuses
      if (b.stat && b.amount) {
        player.trainStat(b.stat, b.amount)
      }
      if (b.stats) {
        for (const [stat, amount] of Object.entries(b.stats)) {
          player.trainStat(stat, amount)
        }
      }
      if (b.maxHP) {
        player.resources.hp.max += b.maxHP
        player.resources.hp.current = Math.min(player.resources.hp.current + b.maxHP, player.resources.hp.max)
      }
      if (b.meson) {
        player.addMeson(b.meson)
      }

      player.logActivity(`🎓 Ολοκλήρωσες: ${course.name}`, 'xp')
      gameStore.addNotification(`Μάθημα ολοκληρώθηκε: ${course.name}!`, 'success')
      gameStore.saveGame()
    },

    getSerializable() {
      return {
        completedCourses: [...this.completedCourses],
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.completedCourses) this.completedCourses = [...data.completedCourses]
    },
  },
})
