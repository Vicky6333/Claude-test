function pad(n) {
  return String(n).padStart(2, '0');
}

// 某月份的工作日（周一~周五）天数
function weekdaysInMonth(year, month /* 1-12 */) {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month - 1, d).getDay(); // 0=周日, 6=周六
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

Page({
  data: {
    startTime: '09:00',
    hours: '8',
    wageOn: false,
    salary: '',
    month: '',
    workDays: '',
    offTime: '--:--',
    crossDay: false,
    countdown: '',
    done: false,
    showWage: false,
    dayWage: '--',
    hourWage: '--',
    hint: '填好上班时间即可看到结果',
    confetti: []
  },

  // 实例上的非渲染状态
  offDate: null,
  wasDone: false,
  timer: null,

  onLoad() {
    const now = new Date();
    const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const workDays = String(weekdaysInMonth(now.getFullYear(), now.getMonth() + 1));
    this.setData({ startTime, month, workDays }, () => this.calculate());
  },

  onShow() {
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  },
  onHide() {
    clearInterval(this.timer);
  },
  onUnload() {
    clearInterval(this.timer);
  },

  onStartChange(e) {
    this.setData({ startTime: e.detail.value }, () => this.calculate());
  },
  onHoursInput(e) {
    this.setData({ hours: e.detail.value }, () => this.calculate());
  },
  onWageToggle(e) {
    this.setData({ wageOn: e.detail.value }, () => this.calculate());
  },
  onSalaryInput(e) {
    this.setData({ salary: e.detail.value }, () => this.calculate());
  },
  onWorkDaysInput(e) {
    this.setData({ workDays: e.detail.value }, () => this.calculate());
  },
  onMonthChange(e) {
    const month = e.detail.value; // "YYYY-MM"
    const [y, m] = month.split('-').map(Number);
    this.setData(
      { month, workDays: String(weekdaysInMonth(y, m)) },
      () => this.calculate()
    );
  },

  calculate() {
    const { startTime, hours } = this.data;
    const h = parseFloat(hours);

    if (!startTime || isNaN(h) || h <= 0) {
      this.offDate = null;
      this.setData({
        offTime: '--:--',
        crossDay: false,
        countdown: '',
        showWage: false,
        done: false,
        hint: '请填写上班时间和坐班时长'
      });
      return;
    }

    const [hh, mm] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hh, mm, 0, 0);
    const off = new Date(start.getTime() + h * 3600 * 1000);
    this.offDate = off;

    const patch = {
      offTime: `${pad(off.getHours())}:${pad(off.getMinutes())}`,
      crossDay: off.getDate() !== start.getDate()
    };

    // 时薪：月薪 ÷（本月工作天数 × 每天坐班时长）
    if (this.data.wageOn) {
      const salary = parseFloat(this.data.salary);
      const workDays = parseFloat(this.data.workDays);
      if (!isNaN(salary) && salary > 0 && !isNaN(workDays) && workDays > 0) {
        const dayWage = salary / workDays;
        const hourWage = dayWage / h;
        patch.showWage = true;
        patch.dayWage = `¥ ${dayWage.toFixed(2)} / 天`;
        patch.hourWage = `¥ ${hourWage.toFixed(2)} / 小时`;
      } else {
        patch.showWage = false;
      }
    } else {
      patch.showWage = false;
    }

    this.setData(patch, () => this.updateCountdown());
  },

  updateCountdown() {
    if (!this.offDate) return;
    const diff = this.offDate.getTime() - Date.now();

    if (diff <= 0) {
      this.setData({
        countdown: '🎉 可以下班啦！辛苦了～',
        done: true,
        hint: '收工，下班快乐 🥳'
      });
      if (!this.wasDone) {
        this.wasDone = true;
        this.fireConfetti();
      }
      return;
    }

    if (this.wasDone || this.data.done) {
      this.wasDone = false;
      this.setData({ done: false });
    }

    const totalMin = Math.floor(diff / 60000);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    const ss = Math.floor((diff % 60000) / 1000);

    let txt = '距离下班还有 ';
    if (hh > 0) txt += `${hh} 小时 `;
    txt += `${mm} 分 ${pad(ss)} 秒`;
    this.setData({ countdown: txt, hint: '坚持住，马上就下班 💪' });
  },

  fireConfetti() {
    const colors = ['#0071e3', '#34c759', '#ff375f', '#ffd60a', '#5856d6', '#ff9f0a'];
    const pieces = [];
    for (let i = 0; i < 26; i++) {
      pieces.push({
        id: i,
        left: (Math.random() * 100).toFixed(1),
        color: colors[i % colors.length],
        delay: (Math.random() * 0.35).toFixed(2)
      });
    }
    this.setData({ confetti: pieces });
    setTimeout(() => this.setData({ confetti: [] }), 2300);
  }
});
