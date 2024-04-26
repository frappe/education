export function getCalendarDates(month, year) {
	let daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	let firstDay = new Date(year, month, 1)
	let leftPadding = firstDay.getDay()
  
	let datesInPreviousMonth = getBeforeDates(firstDay, leftPadding)
	let datesInCurrentMonth = getCurrentMonthDates(firstDay)
	let datesTillNow = [...datesInPreviousMonth, ...datesInCurrentMonth]
	let datesInNextMonth = getNextMonthDates(datesTillNow)
  
	let allDates = [...datesTillNow, ...datesInNextMonth]
  
	return allDates
  
	function getCurrentMonthDates(date) {
	  let month = date.getMonth()
	  if (month == 1 && isLeapYear(date)) {
		daysInMonth[month] = 29
	  }
  
	  let numberOfDays = daysInMonth[month] + 1
	  let allDates = getDatesAfter(date, 1, numberOfDays)
	  return allDates
	}
  
	function getBeforeDates(firstDay, leftPadding) {
	  let allDates = getDatesAfter(firstDay, 0, leftPadding, -1)
	  allDates = allDates.reverse()
	  return allDates
	}
  
	function getNextMonthDates(currentAndPreviousMonthDates) {
	  let lengthOfDates = currentAndPreviousMonthDates.length
	  let lastDate = currentAndPreviousMonthDates[lengthOfDates - 1]
	  let diff = 42 - lengthOfDates + 1
  
	  let allDates = getDatesAfter(lastDate, 1, diff, 1, true)
	  return allDates
	}
  
	function getDatesAfter(
	  date,
	  startIndex,
	  counter,
	  stepper = 1,
	  getNextMonthDates = false
	) {
	  let allDates = []
	  for (let index = startIndex; index < counter; index++) {
		let tempDate = new Date(
		  date.getFullYear(),
		  getNextMonthDates ? date.getMonth() + 1 : date.getMonth(),
		  index * stepper
		)
		allDates.push(tempDate)
	  }
	  return allDates
	}
  
	function isLeapYear(date) {
	  let year = date.getFullYear()
	  return year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)
	}
}
  
export function groupBy(obj, fn) {
	if (typeof fn !== 'function') throw new Error(`${fn} should be a function`)
	return Object.keys(obj).reduce((acc, key) => {
		const group = fn(obj[key])
		if (!acc[group]) {
		acc[group] = []
		}
		acc[group].push(obj[key])
		return acc
	}, {})
}


export function calculateMinutes(time) {
	let [hours, minutes] = time.split(':')
	return parseInt(hours) * 60 + parseInt(minutes)
}

export function convertMinutesToHours(minutes){
	let hours = Math.floor(minutes / 60)
	let remainingMinutes = minutes % 60
	if (hours < 10) hours = `0${hours}`
	if (remainingMinutes < 10) remainingMinutes = `0${remainingMinutes}`
	return `${hours}:${remainingMinutes}:00`
}

export function parseDate(date) {
	if (typeof date === 'string') {
		date = new Date(date)
	}
	let dd = date.getDate()
	let mm = date.getMonth() + 1
	let yyyy = date.getFullYear()
  
	if (dd < 10) dd = '0' + dd
	if (mm < 10) mm = '0' + mm
  
	return `${yyyy}-${mm}-${dd}`
}

export function parseDateEventPopupFormat(date,showDay=true) {
	const options = {
		month: 'short',
		day: 'numeric',
	}
	if(showDay){
		options.weekday = 'short'
	}
	return date.toLocaleDateString('en-US', options)
}

export function parseDateWithComma(date){
	return parseDateEventPopupFormat(date, false).split(' ').join(', ')
}

export function calculateDiff(from, to) {
	let fromMinutes = calculateMinutes(from)
	let toMinutes = calculateMinutes(to)
	return toMinutes - fromMinutes
}

export function removeSeconds(time) {
	return time.split(':').slice(0, 2).join(':') + ':00'
}

// Helpers 

export const monthList = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

export const daysList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const twentyFourHoursFormat = [
	'00:00',
	'01:00',
	'02:00',
	'03:00',
	'04:00',
	'05:00',
	'06:00',
	'07:00',
	'08:00',
	'09:00',
	'10:00',
	'11:00',
	'12:00',
	'13:00',
	'14:00',
	'15:00',
	'16:00',
	'17:00',
	'18:00',
	'19:00',
	'20:00',
	'21:00',
	'22:00',
	'23:00',
]