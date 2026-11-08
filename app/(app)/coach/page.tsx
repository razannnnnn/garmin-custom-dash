// app/(app)/coach/page.tsx — Coach (segera hadir)

import { Activity, Brain, LineChart, MessagesSquare, Moon, Sparkles } from "lucide-react";

export const metadata = { title: "Coach — Garmin Dash" };

const READS = [
  { icon: LineChart, label: "Kesiapan & beban latihan", body: "Skor readiness, training status, dan tren beban 30 hari." },
  { icon: Moon, label: "Tidur & HRV", body: "Durasi, fase tidur, efisiensi, dan variabilitas detak jantung." },
  { icon: Activity, label: "Detail setiap sesi", body: "Pace, splits per kilometer, cadence, power, dan zona jantung." },
];

export default function CoachPage() {
  return (
    <>
      <div className="vhead">
        <h2>Coach</h2>
        <p>Pelatih AI yang membaca seluruh data latihan Anda.</p>
      </div>

      <div className="coachhero">
        <span className="coachicon" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <div>
          <h3>Segera hadir</h3>
          <p>
            Coach masih dalam pengembangan. Nanti Anda bisa bertanya soal program latihan,
            pemulihan, atau kenapa pace turun di kilometer terakhir — dan jawabannya diambil
            dari data Garmin Anda sendiri, bukan saran generik.
          </p>
        </div>
        <span className="badge">Belum aktif</span>
      </div>

      <section className="sec">
        <div className="sec-h">
          <h2>Yang akan dibaca Coach</h2>
        </div>
        <ul className="coachlist">
          {READS.map(({ icon: Icon, label, body }) => (
            <li key={label}>
              <span className="coachlist-ic" aria-hidden="true">
                <Icon size={16} />
              </span>
              <div>
                <b>{label}</b>
                <em>{body}</em>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="sec">
        <div className="sec-h">
          <h2>Contoh pertanyaan</h2>
        </div>
        <ul className="coachq">
          <li>
            <MessagesSquare size={14} aria-hidden="true" />
            Kenapa readiness saya turun tiga hari terakhir?
          </li>
          <li>
            <Brain size={14} aria-hidden="true" />
            Apakah beban minggu ini terlalu berat untuk half marathon?
          </li>
          <li>
            <MessagesSquare size={14} aria-hidden="true" />
            Bandingkan pace lari 10 km saya bulan ini dan bulan lalu.
          </li>
        </ul>
      </section>
    </>
  );
}
