import { toast } from 'frappe-ui'
export function createToast(options) {
	toast({
	  position: 'bottom-right',
	  ...options,
	})
  }

 export function getCalendarDates (month=0,year=0) {
	let daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
	let firstDay = new Date(year, month, 1) 
	let leftPadding = firstDay.getDay()
	// debugger
	let datesInCurrentMonth = getCurrentMonthDates(firstDay)
	let datesInPreviousMonth = getBeforeDates(firstDay,leftPadding)
	let datesTillNow = [...datesInPreviousMonth,...datesInCurrentMonth]
	let datesInNextMonth = getNextMonthDates(datesTillNow)
	let allDates = [...datesTillNow,...datesInNextMonth]
	
	return allDates
	
	function getCurrentMonthDates(date) {
		let month = date.getMonth()
		if (month == 1 && isLeapYear(date)) {
			daysInMonth[month] = 29
		}

		let numberOfDays = daysInMonth[month] + 1
		let allDates = getDatesAfter(date,1,numberOfDays)
		return allDates
	}
	
	function getBeforeDates(firstDay,leftPadding) {
		let allDates = getDatesAfter(firstDay,0,leftPadding,-1)
		allDates = allDates.reverse()
		return allDates
	}
	
	function getNextMonthDates (currentAndPreviousMonthDates) {
		let lengthOfDates = currentAndPreviousMonthDates.length
		let lastDate = currentAndPreviousMonthDates[lengthOfDates-1]
		let diff = 42 - lengthOfDates + 1

		let allDates = getDatesAfter(lastDate, 1, diff, 1 ,true)
		return allDates
	}

	function getDatesAfter(date,startIndex,counter,stepper=1,getNextMonthDates=false) {

		let allDates = []
		for (let index = startIndex; index < counter; index++) {
			let tempDate = new Date(date.getFullYear(),getNextMonthDates ? date.getMonth() + 1 : date.getMonth() ,index*stepper)
            // debugger
			allDates.push(tempDate)
		}
        // debugger
		return allDates
	}

	function isLeapYear(date){
		let year = date.getFullYear()
		return year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)
	}
}

export let dataFromBackend = [
    {
        "type":"todo",
        "is_full_day_event": false,
        "icon":'circle',
        "color": "blue",
        "date": "2024-02-04",
        "room": "HTL-ROOM-2023-00006",
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Ma",
        "name": "EDU-CSH-2023-00121",
    },
    {
        "type":"class",
        "is_full_day_event": false,
        "icon":'circle',
        "color": 'yellow',
        "date": "2024-02-04",
        "room": "HTL-ROOM-2023-00006",
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "M-2 ",
        "name": "EDU-CSH-2023-00142"
    },
    {
        "type":"class",
        "is_full_day_event": false,
        "icon":'circle',
        "color": 'blue',
        "date": "2024-02-05",
        "room": "HTL-ROOM-2023-00006",
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal ",
        "name": "EDU-CSH-2023-00122",

    },
    {
        "date": "2023-12-04",
        "room": "HTL-ROOM-2023-00006",
        "color": 'orange',
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00143"
    },
    {
        "type":"meeting",
        "date": "2024-02-12",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal",
        "name": "EDU-CSH-2023-00123"
    },
    {
        "date": "2023-12-05",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00144"
    },
    {
        "date": "2023-12-06",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00124"
    },
    {
        "date": "2023-12-06",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00145"
    },
    {
        "date": "2023-12-07",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00125"
    },
    {
        "date": "2023-12-07",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00146"
    },
    {
        "date": "2023-12-08",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00126"
    },
    {
        "date": "2023-12-08",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00147"
    },
    {
        "date": "2023-12-11",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00127"
    },
    {
        "date": "2023-12-11",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00148"
    },
    {
        "date": "2023-12-12",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00128"
    },
    {
        "date": "2023-12-12",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00149"
    },
    {
        "date": "2023-12-13",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00129"
    },
    {
        "date": "2023-12-13",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00150"
    },
    {
        "date": "2023-12-14",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00130"
    },
    {
        "date": "2023-12-14",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00151"
    },
    {
        "date": "2023-12-15",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00131"
    },
    {
        "date": "2023-12-15",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00152"
    },
    {
        "date": "2023-12-18",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00132"
    },
    {
        "date": "2023-12-18",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00153"
    },
    {
        "date": "2023-12-19",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00133"
    },
    {
        "date": "2023-12-19",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00154"
    },
    {
        "date": "2023-12-20",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00134"
    },
    {
        "date": "2023-12-20",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00155"
    },
    {
        "date": "2023-12-21",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00135"
    },
    {
        "date": "2023-12-21",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00156"
    },
    {
        "date": "2023-12-22",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00136"
    },
    {
        "date": "2023-12-22",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00157"
    },
    {
        "date": "2023-12-25",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00137"
    },
    {
        "date": "2023-12-25",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00158"
    },
    {
        "date": "2023-12-26",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00138"
    },
    {
        "date": "2023-12-26",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00159"
    },
    {
        "date": "2023-12-27",
        "room": "HTL-ROOM-2023-00006",
        "color": "#5c3434",
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00139"
    },
    {
        "date": "2023-12-27",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00160"
    },
    {
        "date": "2023-12-28",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00140"
    },
    {
        "date": "2023-12-28",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00161"
    },
    {
        "date": "2023-12-29",
        "room": "HTL-ROOM-2023-00006",
        "color": "#29CD42",
        "course": "DSA",
        "from_time": "13:00",
        "to_time": "14:30",
        "instructor": "EDU-INS-2023-00005",
        "title": "DSA by Portal Professor",
        "name": "EDU-CSH-2023-00141"
    },
    {
        "date": "2023-12-29",
        "room": "HTL-ROOM-2023-00006",
        "color": null,
        "course": "C9",
        "from_time": "15:00",
        "to_time": "17:30",
        "instructor": "EDU-INS-2023-00006",
        "title": "C9 by Portal Professor 2",
        "name": "EDU-CSH-2023-00162"
    }
]

export let dataFromBackend2 = [
        {
            "title": "Present",
            "color": "green",
            "id": "EDU-ATT-2024-00001",
            "date": "2024-02-01"
        },
        {
            "title": "Absent",
            "color": "red",
            "id": "EDU-ATT-2024-00004",
            "date": "2024-02-05"
        },
        {
            "title": "Absent",
            "color": "red",
            "id": "EDU-ATT-2024-00005",
            "date": "2024-02-07"
        },
        {
            "title": "Absent",
            "color": "red",
            "id": "EDU-ATT-2024-00006",
            "date": "2024-02-08"
        },
        {
            "title": "Absent",
            "color": "red",
            "id": "EDU-ATT-2024-00007",
            "date": "2024-02-09"
        },
        {
            "title": "Absent",
            "color": "red",
            "id": "EDU-ATT-2024-00009",
            "date": "2024-02-12"
        },
        {
            "title": "Absent",
            "color": "red",
            "id": "EDU-ATT-2024-00011",
            "date": "2024-02-13"
        }
]
