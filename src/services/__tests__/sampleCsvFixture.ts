/**
 * Synthetic multi-year workout CSV fixture used in CI (when local test_data/ is gitignored)
 * and for deterministic parser/analytics tests. Intentionally includes:
 * - Mixed CRLF (\r\n) and lone LF (\n) line endings
 * - Emojis in workout titles
 * - Repeated exercise blocks with set_index restarting at 0
 * - All 4 set_types (warmup, normal, dropset, failure)
 * - Weighted, bodyweight, assisted, duration, and cardio sets
 * - Optional decimal RPE values
 */
export const SYNTHETIC_WORKOUT_CSV = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"C","20 Nov 2026, 09:59","20 Nov 2026, 11:26","","Chest Press (Machine)",,"",0,"warmup",25,12,,,6',
  '"C","20 Nov 2026, 09:59","20 Nov 2026, 11:26","","Chest Press (Machine)",,"",1,"normal",47.5,9,,,9.5',
  '"C","20 Nov 2026, 09:59","20 Nov 2026, 11:26","","Chest Press (Machine)",,"",2,"failure",47.5,8,,,10',
  '"C","20 Nov 2026, 09:59","20 Nov 2026, 11:26","","Pull Up (Assisted)",,"",0,"normal",20,10,,,9',
  '"C","20 Nov 2026, 09:59","20 Nov 2026, 11:26","","Plank",,"",0,"normal",,, ,65,8.5',
  '"B","17 Nov 2026, 18:10","17 Nov 2026, 19:20","","Seated Cable Row - Bar Wide Grip",,"",0,"normal",45,10,,,9',
  '"B","17 Nov 2026, 18:10","17 Nov 2026, 19:20","","Chest Press (Machine)",,"",0,"normal",45,10,,,9',
  '"B","17 Nov 2026, 18:10","17 Nov 2026, 19:20","","Treadmill",,"",0,"normal",,,,600,',
  '"A","10 Nov 2026, 10:00","10 Nov 2026, 11:05","","Chest Press (Machine)",,"",0,"normal",45,9,,,8.5',
  '"A","10 Nov 2026, 10:00","10 Nov 2026, 11:05","","Pull Up (Assisted)",,"",0,"dropset",25,8,,,9.5',
  '"Afternoon workout 💪","28 Oct 2026, 15:00","28 Oct 2026, 16:00","","Chest Press (Machine)",,"",0,"normal",42.5,10,,,8.5',
  '"Afternoon workout 💪","28 Oct 2026, 15:00","28 Oct 2026, 16:00","","Push Up",,"",0,"normal",,15,,,',
  '"Late night workout 🌙","12 Sep 2026, 21:00","12 Sep 2026, 22:00","","Chest Press (Machine)",,"",0,"normal",40,10,,,8',
  '"Leg","17 Jan 2026, 14:36","17 Jan 2026, 15:55","","Hip Abduction (Machine)",,"",0,"warmup",30,12,,,',
  '"Leg","17 Jan 2026, 14:36","17 Jan 2026, 15:55","","Leg Extension (Machine)",,"",0,"normal",50,12,,,',
  '"Leg","17 Jan 2026, 14:36","17 Jan 2026, 15:55","","Hip Abduction (Machine)",,"",0,"normal",65,12,,,',
  '"Leg","17 Jan 2026, 14:36","17 Jan 2026, 15:55","","Hip Abduction (Machine)",,"",1,"normal",65,9,,,',
  '"Push","18 Nov 2025, 11:00","18 Nov 2025, 12:00","","Chest Press (Machine)",,"",0,"normal",37.5,10,,,',
  '"Pull","9 Jul 2025, 15:30","9 Jul 2025, 16:30","","Pull Up (Assisted)",,"",0,"normal",30,10,,,',
  '"Pull","9 Jul 2025, 15:30","9 Jul 2025, 16:30","","Plank",,"",0,"normal",,,,45,',
]
  // Inject a lone LF between line 5 and 6 to simulate mixed CRLF/LF pagination exports
  .map((line, idx) => (idx === 5 ? `${line}\n` : `${line}\r\n`))
  .join('');
