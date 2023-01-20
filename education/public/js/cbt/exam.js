class CBT {
	constructor(wrapper, options) {
		this.wrapper = wrapper;
		Object.assign(this, options);
		this.question = null;
		this.total_questions = null;
		this.get_quiz("initialise");
		this.current_cbt_name = null;
		this.current_question = null;
		this.active = true;
	}

	initialise(data){
		$(".lms-timer").removeClass("hide");
		this.initialiseTimer(data.duration);
		this.is_time_bound = true;
		this.time_taken = 0;
		this.select_question_input = document.getElementById("lms-select");
		this.display_select_question_input(data.total_questions)
		this.make(data)
	}


	get_quiz(action) {
		this.wrapper.innerHTML = '<div class="spinner-border" style="width: 3rem; height: 3rem;" role="status"><span class="sr-only">Loading...</span></div>'
		frappe.call('education.education.utils.get_current_cbt', {
			cbt_name: this.name,
			subject: this.course
		}).then(res => {
			// Hide the loading indicator
			if (res.message.unenrolled){
				frappe.msgprint({
					title: __('Warning'),
					indicator: 'red',
					message: __(`You have not been registered for this examination. Contact the administrator`)
				});
			}
			this.wrapper.innerHTML = '';
			if (!res.message){
				this.active = false
			}
			if (action === "refresh") {
				this.make(res.message)
			} else if (action === "initialise") {
				this.initialise(res.message)
			}
		});

	}

	display_select_question_input(total_questions){
		for (let i = 1; i <= parseInt(total_questions); i++) {
			this.select_question_input.options[i] = new Option(i, i);
		}
		if (this.select_question_input.options[0].value == ""){
			this.select_question_input.options[0].remove()
		}
		this.select_question_input.addEventListener('change', (e) => {
			this.wrapper.innerHTML = "Loading";
			this.navigate(parseInt(this.select_question_input.value));
		});
	}

	make(data) {
		// add question
		let question_wrapper = document.createElement('div');
		let question_data = data.question
		this.current_cbt_name = data.current_cbt
		let question = new Question({
			current_question: data.current_question,
			wrapper: question_wrapper,
			...question_data
		});
		this.question = question
		this.current_question = data.current_question
		this.total_questions = data.total_questions
		this.wrapper.appendChild(question_wrapper);

		// add previously selected option
		this.select_question_input.disabled = false;

		let selected_option = data.selected_option
		if (selected_option){
			this.question.selected(selected_option)
		}
		
		if (data.activity && data.activity.is_complete) {
			this.disable()
			let indicator = 'red'
			let message = 'Your are not allowed to attempt the cbt again.'
			if (data.activity.result == 'Pass') {
				indicator = 'green'
				message = 'You have already cleared the cbt.'
			}
			if (data.activity.time_taken) {
				this.calculate_and_display_time(data.activity.time_taken, "Time Taken - ");
			}
			this.set_quiz_footer(message, indicator, data.activity.score)
		}
		else {
			this.make_actions();
		}
		window.addEventListener('beforeunload', (event) => {
			event.preventDefault();
			event.returnValue = '';
		});
		// Set a counter to keep track of the number of times the user has tried
		// to change or close the current tab
		let counter = 0;

		// Add an event listener to the blur event, which is triggered
		// when the user moves focus away from the current window or tab
		window.addEventListener('blur', () => {
		if (this.active){
			// Increment the counter
			counter += 1;

			// If the counter is less than 3, show a warning message to the user
			if (counter < 3) {
				// Show a warning message to the user
				frappe.msgprint({
					title: __('Warning'),
					indicator: 'red',
					message: __(`Stop Changing Tabs. This is examination malpractice. Your exam would be submitted if you continue.
						You have been warned ${counter} times`)
				});
			}
			// If the counter is equal to 3, send an API call to record the user's action
			else if (counter === 3) {
				this.navigate("submit")
			}
		}
		});

	}

	initialiseTimer(duration) {
		if (!duration){
			duration = 86400 //ToDos: remove this, make duration compulsory
		}
		this.time_left = duration;
		var self = this;
		var old_diff;
		this.calculate_and_display_time(this.time_left, "Time Left - ");
		this.start_time = new Date().getTime();
		this.timer = setInterval(function () {
			var diff = (new Date().getTime() - self.start_time)/1000;
			var variation = old_diff ? diff - old_diff : diff;
			old_diff = diff;
			self.time_left -= variation;
			self.time_taken += variation;
			self.calculate_and_display_time(self.time_left, "Time Left - ");
			if (self.time_left <= 0) {
				clearInterval(self.timer);
				self.time_taken -= 1;
				this.navigate("submit");
			}
		}, 1000);
	}

	calculate_and_display_time(second, text) {
		var timer_display = document.getElementsByClassName("lms-timer")[0];
		var hours = this.append_zero(Math.floor(second / 3600));
		var minutes = this.append_zero(Math.floor(second % 3600 / 60));
		var seconds = this.append_zero(Math.ceil(second % 3600 % 60));
		timer_display.innerText = text + hours + ":" + minutes + ":" + seconds;
	}

	append_zero(time) {
		return time > 9 ? time : "0" + time;
	}

	make_actions() {
		const previous_button = document.createElement("button");
		previous_button.classList.add("btn", "btn-primary", "mt-5", "mr-2");
		previous_button.id = 'previous-button';
		previous_button.innerText = 'previous';
		previous_button.onclick = () => this.navigate("previous");
		this.previous_btn = previous_button

		const next_button = document.createElement("button");
		next_button.classList.add("btn", "btn-primary", "mt-5", "mr-2");
		next_button.id = 'next-button';
		next_button.innerText = 'Next';
		next_button.onclick = () => this.navigate("next");
		this.next_btn = next_button

		const submit_button = document.createElement("button");
		submit_button.classList.add("btn", "btn-primary", "mt-5", "mr-2");
		submit_button.id = 'submit-button';
		submit_button.innerText = 'Submit';
		submit_button.onclick = () => this.navigate("submit");
		this.submit_btn = submit_button


		if (this.current_question !==  1) {
			this.wrapper.appendChild(previous_button);
		}
		
		if (this.current_question !==  this.total_questions) {
			this.wrapper.appendChild(next_button);
		} else {
			this.wrapper.appendChild(submit_button);
		}

	}

	navigate(direction) {
		this.wrapper.innerHTML = '<div class="spinner-border" style="width: 3rem; height: 3rem;" role="status"><span class="sr-only">Loading...</span></div>'
		this.disable()	
		let subsequent_question;
		this.select_question_input.disabled = true;
		if (direction === "next"){
			this.next_btn.innerText = 'Saving..'
			subsequent_question = this.current_question + 1  
			this.next_btn.disabled = true
			this.previous_btn.diasbled = true
		} else if (direction == "previous") {
			this.previous_btn.innerText = 'Saving..'
			subsequent_question = this.current_question - 1  
			this.previous_btn.diasbled = true
			this.next_btn.disabled = true
		} else if(Number.isInteger(direction)){
			this.previous_btn.disabled = true ? this.previous_btn : " ";
			this.next_btn.disabled = true ? this.next_btn : ""; 
			this.submit_btn.disabled = true ? this.submit_btn : "";
			subsequent_question = direction;
		} else {
			this.submit_btn.innerText = 'Saving..'
			this.previous_btn.diasbled = true
			this.submit_btn.disabled = true
			subsequent_question = 0
		}
		let current = this.current_question
		frappe.call('education.education.utils.submit_question', {
			current_cbt_name: this.current_cbt_name,
			response: this.question.get_selected(),
			question: this.question.name,
			subject: this.course,
			student_class: this.program,
			time_left: this.time_left,
			subsequent_question: subsequent_question
		}).then(res => {
			if (!res.message) {
				frappe.throw(__("Something went wrong while submitting this question. Please refresh"))
			}
			this.wrapper.innerHTML = ''
			if (direction === "submit"){
				this.active = false;
				if (this.is_time_bound) {
					clearInterval(this.timer);
					$(".lms-timer").text("");
				}
				let indicator = 'red'
				let message = 'Fail'
				if (res.message.status == 'Pass') {
					indicator = 'green'
					message = 'Congratulations, you cleared the quiz.'
				}

				this.set_quiz_footer(message, indicator, res.message.score)
			}
			else {
				this.get_quiz("refresh")
			}
		});

	}


	set_quiz_footer(message, indicator, score) {
		const div = document.createElement("div");
		div.classList.add("mt-5");
		div.innerHTML = `<div class="row">
							<div class="col-md-8">
								<h4>${message}</h4>
								<h5 class="text-muted"><span class="indicator ${indicator}">Score: ${score}/100</span></h5>
							</div>
							<div class="col-md-4">
								<a href="${this.next_url}" class="btn btn-primary pull-right">${this.quiz_exit_button}</a>
							</div>
						</div>`

		this.wrapper.appendChild(div)
	}

	disable() {
		this.question.disable()
	}

}

class Question {
	constructor(opts) {
		Object.assign(this, opts);
		this.make();
	}

	make() {
		this.make_question()
		this.make_options()
	}

	selected(opts){
		let options = this.options
		if (this.type == 'Single Correct Answer'){
			this.options.find(opt  => opt.name === opts).input.checked = true
		} else {
			this.options.filter(opt  => opts.includes(opt.name)).forEach((opt) => opt.input.checked = true)
		}
	}

	get_selected() {
		let selected = this.options.filter(opt => opt.input.checked)
		if (this.type == 'Single Correct Answer') {
			if (selected[0]) return selected[0].name
		}
		if (this.type == 'Multiple Correct Answer') {
			return selected.map(opt => opt.name)
		}
		return null
	}

	disable() {
		let selected = this.options.forEach(opt => opt.input.disabled = true)
	}

	make_question() {
		let question_wrapper = document.createElement('h5');
		question_wrapper.classList.add('mt-3');
		question_wrapper.innerHTML = `<p class="text-primary">Question ${this.current_question}</p>` + this.question.question;
		this.wrapper.appendChild(question_wrapper);
	}

	make_options() {
		let make_input = (name, value) => {
			let input = document.createElement('input');
			input.id = name;
			input.name = this.name;
			input.value = value;
			input.type = 'radio';
			if (this.type == 'Multiple Correct Answer')
				input.type = 'checkbox';
			input.classList.add('form-check-input');
			return input;
		}

		let make_label = function (name, value) {
			let label = document.createElement('label');
			label.classList.add('form-check-label');
			label.htmlFor = name;
			label.innerText = value;
			return label
		}

		let make_option = function (wrapper, option) {
			let option_div = document.createElement('div');
			option_div.classList.add('form-check', 'pb-1');
			let input = make_input(option.name, option.option);
			let label = make_label(option.name, option.option);
			option_div.appendChild(input);
			option_div.appendChild(label);
			wrapper.appendChild(option_div);
			return { input: input, ...option };
		}

		let options_wrapper = document.createElement('div')
		options_wrapper.classList.add('ml-2')
		let option_list = []
		this.options.forEach(opt => option_list.push(make_option(options_wrapper, opt)))
		this.options = option_list
		this.wrapper.appendChild(options_wrapper)
	}
}