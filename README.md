<div align="center" markdown="1">

<img src=".github/edu-logo.svg" alt="Frappe Education Logo" width="80">

<h1>Frappe Education</h1>

**Empowering Schools with Smarter Management**

![GitHub release (latest by date)](https://img.shields.io/github/v/release/frappe/education)

</div>


<div align="center">
	<img width="1552" alt="Screenshot 2025-01-01 at 6 24 15 PM" src="https://github.com/user-attachments/assets/46af048c-749f-41f7-8d10-47e4fa643592" width="100%" />

</div>
<br />
<div align="center">
	<a href="https://frappe.io/education">Website</a>
	-
	<a href="https://docs.frappe.io/education">Documentation</a>
</div>

## Frappe Education
Frappe Education is an open-source and user-friendly Education Management System designed to streamline the administrative and academic processes of educational institutions. It is a powerful module based on the ERPNext software.

### Motivation
All the tools to manage which are available in the market were just not good enough.They were way too scatered, or too expensive or too complex to use. We wanted to create a tool that is easy to use, affordable and can be customized as per the needs of the institution.
Frappe Education is dedicated to making education management more efficient and less time-consuming.

### Key Features

- **Student & Teacher Management** - Manage student and teacher profiles, attendance.

- **Admission Management** - Streamline the admission process for new students.

- **Fee Management** - Organize and manage the fee structure and schedule payments.

- **Course Scheduling & Exam Planning** - Efficiently schedule courses and manage course calendars.

- **Student Portal** - Students can visit the portal to check their timetable, attendance, pay fees online, and see current and previous grades.

<details open>
<summary >View Screenshots</summary>
<h3></h3>
<div align="center">
	<sub>
		Student Management
	</sub>
</div>


<img width="1300" alt="Screenshot 2025-01-01 at 6 09 34 PM" src="https://github.com/user-attachments/assets/78263a31-eb9f-45f0-a7a4-486f75c2b774" />




<div align="center">
	<sub>
		Organize and manage the fee structure and schedule payments.
	</sub>
</div>

<img width="1300" alt="Screenshot 2025-01-01 at 6 12 40 PM" src="https://github.com/user-attachments/assets/7dcf7e7b-a003-4520-a41e-84ca553e7f0d" />


<div align="center">
	<sub>
		Efficiently schedule courses and manage course calendars. 🗓️
	</sub>
</div>


<img width="1300" alt="Screenshot 2025-01-01 at 6 19 49 PM" src="https://github.com/user-attachments/assets/19106f12-c278-48f9-8be3-47db5ce3a5f3" />


<div align="center">
	<sub>
		Student Portal - Fee Payment Records
	</sub>
</div>

<img width="1300" alt="Screenshot 2025-01-01 at 6 16 27 PM" src="https://github.com/user-attachments/assets/0640c623-bc81-4308-a15d-53a5977d5011" />


</details>
<br>

### Under the Hood

- [**Frappe Framework**](https://github.com/frappe/frappe): A full-stack web application framework written in Python and Javascript.

- [**ERPNext**](https://github.com/frappe/erpnext) - An open-source, modern ERP system that includes modules for accounting, inventory, manufacturing, and more.

- [**Frappe UI**](https://github.com/frappe/frappe-ui): A Vue-based UI library, to provide a modern user interface. 


## Production Setup

### Managed Hosting

You can try [Frappe Cloud](https://frappecloud.com), a simple, user-friendly and sophisticated [open-source](https://github.com/frappe/press) platform to host Frappe applications with peace of mind.

It takes care of installation, setup, upgrades, monitoring, maintenance and support of your Frappe deployments. It is a fully featured developer platform with an ability to manage and control multiple Frappe deployments.

<div>
	<a href="https://frappecloud.com/education/signup" target="_blank">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="https://frappe.io/files/try-on-fc-white.png">
			<img src="https://frappe.io/files/try-on-fc-black.png" alt="Try on Frappe Cloud" height="28" />
		</picture>
	</a>
</div>

### Self Hosting

Follow these steps to set up Frappe Education in production:

**Step 1**: Download the easy install script

```bash
wget https://frappe.io/easy-install.py
```

**Step 2**: Run the deployment command

```bash
python3 ./easy-install.py deploy \
    --project=education_prod_setup \
    --email=your_email.example.com \
    --image=ghcr.io/frappe/education \
    --version=stable \
    --app=education \
    --sitename subdomain.domain.tld
```

Replace the following parameters with your values:
- `your_email.example.com`: Your email address
- `subdomain.domain.tld`: Your domain name where Education will be hosted

The script will set up a production-ready instance of Frappe Education with all the necessary configurations in about 5 minutes.

## Development Setup

### Local 
1. Install bench and setup a `frappe-bench` directory by following the [Installation Steps](https://frappeframework.com/docs/user/en/installation)
1. Install ERPNext by running `bench get-app erpnext`
1. Once ERPNext is installed, install the Education App by using `bench get-app education`

1. In a separate terminal window, create a new site by running `bench new-site education.test`
1. Map your site to localhost with the command `bench --site education.test add-to-hosts`
    
1. After that, you can install the Education app on the required site by running
    ```jsx
    $ bench --site sitename install-app education
    ```
1. Now open the URL `http://education.test:8000/education` in your browser, you should see the app running
1. To access student portal, open the URL `http://education.test:8000/student-portal` in your browser, you should see the student portal running.

### Docker

You need Docker, docker-compose and git setup on your machine. Refer [Docker documentation](https://docs.docker.com/). After that, follow below steps:

**Step 1**: Setup folder and download the required files

    mkdir frappe-education
    cd frappe-education

    # Download the docker-compose file
    wget -O docker-compose.yml https://raw.githubusercontent.com/frappe/education/develop/docker/docker-compose.yml

    # Download the setup script
    wget -O init.sh https://raw.githubusercontent.com/frappe/education/develop/docker/init.sh

**Step 2**: Run the container and daemonize it

    docker compose up -d

**Step 3**: The site [http://education.localhost:8000/](http://education.localhost:8000) should now be available. The default credentials are:

-   Username: Administrator
-   Password: admin

## Learn and connect

- [Telegram Public Group](https://t.me/frappe_education)
- [Discuss Forum](https://discuss.frappe.io/c/erpnext/schools-college-education/40)
- [Documentation](https://docs.frappe.io/education)

<br>
<br>
<div align="center">
	<a href="https://frappe.io" target="_blank">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="https://frappe.io/files/Frappe-white.png">
			<img src="https://frappe.io/files/Frappe-black.png" alt="Frappe Technologies" height="28"/>
		</picture>
	</a>
</div>
