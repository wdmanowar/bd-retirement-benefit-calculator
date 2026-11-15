(function () {
  "use strict";

  // ডিফল্ট হার: অর্থ বিভাগের ২ সেপ্টেম্বর ২০২৬ তারিখের প্রজ্ঞাপন অনুযায়ী।
  // প্রয়োজনে পেজের "হারের তালিকা" থেকে বদলানো যাবে।
  var DEFAULT_PENSION_RATES = {
    5: 21, 6: 24, 7: 27, 8: 30, 9: 33, 10: 36, 11: 39, 12: 42, 13: 45,
    14: 48, 15: 51, 16: 54, 17: 57, 18: 60, 19: 63, 20: 72, 21: 75,
    22: 78, 23: 81, 24: 87, 25: 90
  };

  // [সর্বনিম্ন বছর, সর্বোচ্চ বছর (এর কম), লেবেল, হার]
  var DEFAULT_GRATUITY_RATES = [
    { min: 5,  max: 10,       label: "৫ বা তদূর্ধ্ব, ১০-এর কম", rate: 265 },
    { min: 10, max: 15,       label: "১০ বা তদূর্ধ্ব, ১৫-এর কম", rate: 268 },
    { min: 15, max: 20,       label: "১৫ বা তদূর্ধ্ব, ২০-এর কম", rate: 275 },
    { min: 20, max: Infinity, label: "২০ বা তদূর্ধ্ব", rate: 280 }
  ];

  var MAX_LEAVE_MONTHS = 18;
  var MAX_PENSION_YEARS = 25;

  var BN_DIGITS = "০১২৩৪৫৬৭৮৯";

  function $(id) { return document.getElementById(id); }

  function toEn(str) {
    return String(str).replace(/[০-৯]/g, function (d) {
      return BN_DIGITS.indexOf(d);
    });
  }

  function toBn(str) {
    return String(str).replace(/[0-9]/g, function (d) {
      return BN_DIGITS.charAt(Number(d));
    });
  }

  function parseNum(value) {
    var cleaned = toEn(value).replace(/[,\s]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function money(n) {
    var rounded = Math.round(n);
    return "৳ " + toBn(rounded.toLocaleString("en-IN"));
  }

  function showMessage(text) {
    var el = $("message");
    el.textContent = text;
    el.hidden = false;
  }

  function clearMessage() {
    var el = $("message");
    el.textContent = "";
    el.hidden = true;
  }

  // ---- হারের টেবিল তৈরি ----
  function buildRateTables() {
    var pBody = $("pensionRates").querySelector("tbody");
    var gBody = $("gratuityRates").querySelector("tbody");
    pBody.innerHTML = "";
    gBody.innerHTML = "";

    Object.keys(DEFAULT_PENSION_RATES).forEach(function (year) {
      var tr = document.createElement("tr");
      var label = year === String(MAX_PENSION_YEARS)
        ? toBn(year) + " ও তদূর্ধ্ব"
        : toBn(year);
      tr.innerHTML =
        "<td>" + label + "</td>" +
        '<td><input type="text" inputmode="decimal" data-year="' + year +
        '" value="' + toBn(DEFAULT_PENSION_RATES[year]) + '" aria-label="' +
        label + ' বছরের পেনশন হার"></td>';
      pBody.appendChild(tr);
    });

    DEFAULT_GRATUITY_RATES.forEach(function (row, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.label + "</td>" +
        '<td><input type="text" inputmode="decimal" data-grat="' + i +
        '" value="' + toBn(row.rate) + '" aria-label="' + row.label +
        ' আনুতোষিক হার"></td>';
      gBody.appendChild(tr);
    });
  }

  function readPensionRate(years) {
    var y = Math.min(years, MAX_PENSION_YEARS);
    var input = document.querySelector('input[data-year="' + y + '"]');
    var v = input ? parseNum(input.value) : NaN;
    return isNaN(v) ? DEFAULT_PENSION_RATES[y] : v;
  }

  function readGratuityRate(years) {
    for (var i = 0; i < DEFAULT_GRATUITY_RATES.length; i++) {
      var row = DEFAULT_GRATUITY_RATES[i];
      if (years >= row.min && years < row.max) {
        var input = document.querySelector('input[data-grat="' + i + '"]');
        var v = input ? parseNum(input.value) : NaN;
        return isNaN(v) ? row.rate : v;
      }
    }
    return 0;
  }

  // ---- তারিখ সংক্রান্ত সহায়ক ----
  var BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

  function parseDate(value) {
    if (!value) return null;
    var p = value.split("-");
    if (p.length !== 3) return null;
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return toBn(d.getUTCDate()) + " " + BN_MONTHS[d.getUTCMonth()] + " " + toBn(d.getUTCFullYear());
  }

  function addMonthsUTC(d, n) {
    var y = d.getUTCFullYear();
    var m = d.getUTCMonth() + n;
    var day = d.getUTCDate();
    var res = new Date(Date.UTC(y, m, 1));
    var lastDay = new Date(Date.UTC(res.getUTCFullYear(), res.getUTCMonth() + 1, 0)).getUTCDate();
    res.setUTCDate(Math.min(day, lastDay));
    return res;
  }

  // যোগদান থেকে পিআরএল শুরুর আগের দিন পর্যন্ত বছর-মাস-দিন
  function serviceSpan(from, to) {
    var y = to.getUTCFullYear() - from.getUTCFullYear();
    var m = to.getUTCMonth() - from.getUTCMonth();
    var d = to.getUTCDate() - from.getUTCDate();
    if (d < 0) {
      m -= 1;
      d += new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 0)).getUTCDate();
    }
    if (m < 0) { y -= 1; m += 12; }
    return { years: y, months: m, days: d };
  }

  function dayText(n) {
    var r = Math.round(n * 100) / 100;
    return toBn(String(r)) + " দিন";
  }

  function monthDayText(days) {
    var months = Math.floor(days / 30);
    var rest = Math.round((days - months * 30) * 100) / 100;
    var out = [];
    if (months > 0) out.push(toBn(months) + " মাস");
    if (rest > 0 || months === 0) out.push(toBn(String(rest)) + " দিন");
    return out.join(" ");
  }

  // ---- মূল হিসাব ----
  function calculate(e) {
    if (e) e.preventDefault();
    clearMessage();

    var basic = parseNum($("basic").value);
    var surrenderPct = $("surrender").value.trim() === "" ? 50 : parseNum($("surrender").value);
    var allowance = $("allowance").value.trim() === "" ? 0 : parseNum($("allowance").value);
    var taken = $("leaveTaken").value.trim() === "" ? 0 : parseNum($("leaveTaken").value);
    var nonDuty = $("nonDuty").value.trim() === "" ? 0 : parseNum($("nonDuty").value);
    var divisor = $("divisor").value.trim() === "" ? 11 : parseNum($("divisor").value);

    if (isNaN(basic) || basic <= 0) {
      return showMessage("শেষ মূল বেতন সংখ্যায় লিখুন।");
    }
    if (isNaN(surrenderPct) || surrenderPct < 0 || surrenderPct > 100) {
      return showMessage("সমর্পণের শতাংশ ০ থেকে ১০০-এর মধ্যে হতে হবে।");
    }
    if (isNaN(allowance) || allowance < 0) {
      return showMessage("ভাতার পরিমাণ সঠিকভাবে লিখুন।");
    }
    if (isNaN(taken) || taken < 0 || isNaN(nonDuty) || nonDuty < 0) {
      return showMessage("ছুটির দিনের সংখ্যা সঠিকভাবে লিখুন।");
    }
    if (isNaN(divisor) || divisor <= 0) {
      return showMessage("অর্জিত ছুটির ভাগহার ০-এর বেশি হতে হবে।");
    }

    var notes = [];

    // ---- তারিখ থেকে ছুটির জের ----
    var joinD = parseDate($("joinDate").value);
    var prlD = parseDate($("prlDate").value);
    var datesGiven = !!(joinD && prlD);
    var balanceDays = null;
    var spanYears = null;
    var spanMonths = null;

    if (($("joinDate").value || $("prlDate").value) && !datesGiven) {
      return showMessage("ছুটির হিসাবের জন্য যোগদান ও পিআরএল শুরুর দুটি তারিখই দিন।");
    }

    if (datesGiven) {
      if (prlD <= joinD) {
        return showMessage("পিআরএল শুরুর তারিখ যোগদানের তারিখের পরে হতে হবে।");
      }
      var serviceDays = Math.round((prlD - joinD) / 86400000);
      var dutyDays = serviceDays - nonDuty;
      if (dutyDays < 0) {
        return showMessage("কর্তব্যবহির্ভূত কাল মোট কর্মকালের বেশি হতে পারে না।");
      }
      var earned = dutyDays / divisor;
      balanceDays = earned - taken;
      var span = serviceSpan(joinD, prlD);
      spanYears = span.years;
      spanMonths = span.months;

      $("lServiceDays").textContent =
        toBn(span.years) + " বছর " + toBn(span.months) + " মাস " + toBn(span.days) + " দিন";
      $("lEarned").textContent = dayText(earned);
      $("lTaken").textContent = dayText(taken);
      $("lPrlEnd").textContent = fmtDate(new Date(addMonthsUTC(prlD, 12) - 86400000));

      if (balanceDays < 0) {
        notes.push("ভোগকৃত ছুটি অর্জিত ছুটির চেয়ে বেশি, জের ০ ধরা হয়েছে।");
        balanceDays = 0;
      }
      $("outBalance").textContent = dayText(balanceDays);
      $("noteBalance").textContent =
        "প্রায় " + monthDayText(balanceDays) + " (৩০ দিনে ১ মাস ধরে)";
      $("leaveBalanceCard").hidden = false;
    } else {
      $("leaveBalanceCard").hidden = true;
    }

    // ---- চাকরিকাল ----
    var yearsRaw;
    var monthsRaw;
    var yearsBlank = $("years").value.trim() === "";
    var monthsBlank = $("months").value.trim() === "";

    if (yearsBlank && monthsBlank && datesGiven) {
      yearsRaw = spanYears;
      monthsRaw = spanMonths;
    } else {
      yearsRaw = yearsBlank ? NaN : parseNum($("years").value);
      monthsRaw = monthsBlank ? 0 : parseNum($("months").value);
    }

    if (isNaN(yearsRaw) || yearsRaw < 0) {
      return showMessage("চাকরিকাল (বছর) লিখুন, অথবা ছুটির হিসাবের দুটি তারিখ দিন।");
    }
    if (isNaN(monthsRaw) || monthsRaw < 0 || monthsRaw > 11) {
      return showMessage("অতিরিক্ত মাস ০ থেকে ১১-এর মধ্যে হতে হবে।");
    }

    // ---- নগদায়নযোগ্য ছুটি ----
    var leaveMonths;
    var leaveBlank = $("leaveMonths").value.trim() === "";
    if (leaveBlank) {
      if (balanceDays !== null) {
        leaveMonths = balanceDays / 30;
      } else {
        leaveMonths = 0;
        notes.push("নগদায়নযোগ্য ছুটির মাস না দেওয়ায় ছুটি নগদায়ন ০ দেখানো হয়েছে।");
      }
    } else {
      leaveMonths = parseNum($("leaveMonths").value);
      if (isNaN(leaveMonths) || leaveMonths < 0) {
        return showMessage("নগদায়নযোগ্য ছুটির মাস সঠিকভাবে লিখুন।");
      }
    }

    // চাকরিকাল: ৬ মাস বা তার বেশি হলে পূর্ণ এক বছর
    var years = Math.floor(yearsRaw) + (monthsRaw >= 6 ? 1 : 0);

    // ছুটি নগদায়ন
    var usedLeave = leaveMonths;
    if (leaveMonths > MAX_LEAVE_MONTHS) {
      usedLeave = MAX_LEAVE_MONTHS;
      notes.push("ছুটি নগদায়ন সর্বোচ্চ " + toBn(MAX_LEAVE_MONTHS) + " মাস ধরা হয়েছে।");
    }
    var leaveAmount = (basic + allowance) * usedLeave;
    var usedLeaveText = toBn(String(Math.round(usedLeave * 100) / 100));

    $("outLeave").textContent = money(leaveAmount);
    $("noteLeave").textContent =
      "(মূল বেতন" + (allowance > 0 ? " + ভাতা" : "") + ") × " + usedLeaveText + " মাস";

    // পেনশন ও আনুতোষিক
    if (years < 5) {
      $("outGratuity").textContent = "প্রযোজ্য নয়";
      $("outNet").textContent = "প্রযোজ্য নয়";
      $("noteGratuity").textContent = "";
      $("notePension").textContent =
        "পেনশনযোগ্য চাকরিকাল ৫ বছরের কম হলে সাধারণ পেনশন মেলে না। বিশেষ ক্ষেত্রে প্রজ্ঞাপনের বিধান দেখুন।";
      $("bRate").textContent = "—";
      $("bGross").textContent = "—";
      $("bSurrender").textContent = "—";
      $("bGRate").textContent = "—";
    } else {
      var pRate = readPensionRate(years);
      var gRate = readGratuityRate(years);

      var grossPension = basic * pRate / 100;
      var surrendered = grossPension * surrenderPct / 100;
      var netPension = grossPension - surrendered;
      var gratuity = surrendered * gRate;

      $("outGratuity").textContent = money(gratuity);
      $("noteGratuity").textContent =
        money(surrendered) + " × " + toBn(gRate) + " টাকা";
      $("outNet").textContent = money(netPension);
      $("notePension").textContent =
        "মূল বেতনের " + toBn(pRate) + "% থেকে " + toBn(surrenderPct) + "% সমর্পণের পর।";

      $("bRate").textContent = toBn(pRate) + "% (" + toBn(Math.min(years, MAX_PENSION_YEARS)) + " বছর)";
      $("bGross").textContent = money(grossPension);
      $("bSurrender").textContent = money(surrendered);
      $("bGRate").textContent = toBn(gRate) + " টাকা";
    }

    if (notes.length) showMessage(notes.join(" "));

    $("placeholder").hidden = true;
    $("output").hidden = false;
  }

  function reset() {
    clearMessage();
    $("output").hidden = true;
    $("placeholder").hidden = false;
    // ফর্ম রিসেটের পর সমর্পণের ডিফল্ট মান ফিরিয়ে আনা এবং হারের টেবিল নতুন করে তৈরি
    setTimeout(function () {
      $("surrender").value = "৫০";
      $("divisor").value = "১১";
      $("leaveBalanceCard").hidden = true;
      buildRateTables();
    }, 0);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildRateTables();
    $("calcForm").addEventListener("submit", calculate);
    $("calcForm").addEventListener("reset", reset);
  });
})();
