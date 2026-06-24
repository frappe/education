<template>
  <Dialog
    v-model="showProfileDialog"
    :options="{
      title: 'Profile',
      size: 'xl',
    }"
  >
    <template #body-content>
      <div class="text-base">
        <div class="flex flex-col gap-4">
          <div
            class="flex items-center border-b border-solid border-lightGray pb-4 gap-2"
          >
            <Avatar
              size="3xl"
              class="h-12 w-12"
              :label="profileInfo.full_name"
              :image="profileInfo.image || null"
            />
            <div class="flex flex-col ml-2 gap-1">
              <p class="text-lg font-semibold">
                {{ profileInfo.full_name }}
              </p>
              <p class="text-gray-600">{{ profileInfo.email_id }}</p>
            </div>
          </div>
          <div>
            <div class="flex gap-4">
              <div
                v-for="section in infoFormat"
                :key="section.section"
                class="flex-1 flex flex-col gap-4"
              >
                <div v-for="field in section.fields" :key="field.label">
                  <div
                    class="flex items-center"
                    v-if="field.label !== 'Address'"
                  >
                    <p class="w-1/2 text-sm text-gray-600">
                      {{ field.label }}:&nbsp;
                    </p>
                    <p class="w-1/2 text-gray-900">{{ field.value }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center">
              <p class="w-[32%] text-sm text-gray-600">
                {{ infoFormat[0].fields[3].label }}:&nbsp;
              </p>
              <p class="w-full text-gray-900">
                {{ infoFormat[0].fields[3].value }}
              </p>
            </div>
          </div>

          <div
            class="flex items-center bg-gray-50 p-2 text-gray-600 text-sm rounded-md"
          >
            <FeatherIcon name="info" class="h-4 mr-2" />
            In case of any incorrect details, please contact the school admin.
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog, Avatar, FeatherIcon } from 'frappe-ui'
import { inject } from 'vue'
import { studentStore } from '@/stores/student'
import { portalStore } from '@/stores/portal'
const { getStudentInfo } = studentStore()
const { isStudent, getGuardianInfo } = portalStore()

const showProfileDialog = inject('showProfileDialog')

const studentInfo = getStudentInfo().value
const guardianInfo = getGuardianInfo().value
let profileInfo = {}

function standardizeProfileInfo(info) {
  if (isStudent) {
    return {
      full_name: info.student_name,
      image: info.image,
      email_id: info.student_email_id,
      mobile_number: info.student_mobile_number,
      joining_date: info.joining_date,
      date_of_birth: info.date_of_birth,
      blood_group: info.blood_group,
      gender: info.gender,
      nationality: info.nationality,
      address_line_1: info.address_line_1,
      address_line_2: info.address_line_2,
      city: info.city,
      pincode: info.pincode,
      state: info.state,
      country: info.country,
    }
  }

  return {
    full_name: guardianInfo.guardian_name,
    image: guardianInfo.image,
    email_id: guardianInfo.email_address,
    mobile_number: guardianInfo.mobile_number,
    occupation: guardianInfo.occupation,
    date_of_birth: guardianInfo.date_of_birth,
    address_line_1: guardianInfo.work_address,
    blood_group: guardianInfo.blood_group,
    gender: guardianInfo.gender,
    nationality: guardianInfo.nationality,
  }
}

if (isStudent) {
  profileInfo = standardizeProfileInfo(studentInfo)
} else {
  profileInfo = standardizeProfileInfo(guardianInfo)
}

const infoFormat = [
  {
    section: 'section 1',
    fields: [
      {
        label: 'Mobile Number',
        value: profileInfo.mobile_number,
      },
      {
        label: 'Joining Date',
        value: profileInfo.joining_date,
      },
      {
        label: 'Date of Birth',
        value: profileInfo.date_of_birth,
      },
      {
        label: 'Address',
        value: [
          profileInfo?.address_line_1,
          profileInfo?.address_line_2,
          profileInfo?.city,
          profileInfo?.pincode,
          profileInfo?.state,
          profileInfo?.country,
        ]
          .map((item) => item?.trim())
          .filter(Boolean)
          .join(', '),
      },
    ],
  },
  {
    section: 'section 2',
    fields: [
      {
        label: 'Blood Group',
        value: profileInfo.blood_group,
      },
      {
        label: 'Gender',
        value: profileInfo.gender,
      },
      {
        label: 'Nationality',
        value: profileInfo.nationality,
      },
    ],
  },
]

if (!isStudent) {
  infoFormat[0].fields.splice(1, 1, {
    label: 'Occupation',
    value: profileInfo.occupation,
  })
}
</script>
