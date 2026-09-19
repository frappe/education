<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import AppToaster from "@/components/AppToaster.vue";
import { useSession } from "@/features/auth/session";
import { messages } from "@/messages";
import AppAvatar from "@/ui/AppAvatar.vue";
import AppBrand from "@/ui/AppBrand.vue";
import AppButton from "@/ui/AppButton.vue";
import AppIcon from "@/ui/AppIcon.vue";
import AppNavItem from "@/ui/AppNavItem.vue";
import AppPublicShell from "@/ui/AppPublicShell.vue";
import AppShell from "@/ui/AppShell.vue";

// The frame of the app. Signed in: a side menu. Not signed in: a slim top bar.
const session = useSession();
const router = useRouter();
const t = messages.nav;
const role = computed(() => (session.isTeacher ? t.teacher : t.student));

async function signOut() {
  await session.signOut();
  await router.replace("/");
}
</script>

<template>
  <AppShell v-if="session.me" :nav-label="t.label" :menu-label="t.menu">
    <template #brand>
      <RouterLink to="/" class="inline-flex"><AppBrand :name="messages.app.name" /></RouterLink>
    </template>
    <template #nav>
      <AppNavItem to="/" icon="home" exact>{{ t.home }}</AppNavItem>
      <template v-if="session.isTeacher">
        <AppNavItem to="/courses" icon="book">{{ t.courses }}</AppNavItem>
        <AppNavItem to="/students" icon="users">{{ t.students }}</AppNavItem>
        <AppNavItem to="/schedule" icon="calendar">{{ t.schedule }}</AppNavItem>
      </template>
      <AppNavItem v-if="session.isStudent" to="/my/courses" icon="book">{{ t.myCourses }}</AppNavItem>
      <AppNavItem to="/devices" icon="devices">{{ t.devices }}</AppNavItem>
    </template>
    <template #footer>
      <div class="flex items-center gap-3 rounded-box border border-base-300 p-3">
        <AppAvatar :name="session.me.user.name" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ session.me.user.name }}</p>
          <p class="truncate text-xs text-base-content/60">{{ role }}</p>
        </div>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-sm"
          :aria-label="t.signOut"
          @click="signOut"
        >
          <AppIcon name="sign-out" :size="18" />
        </button>
      </div>
    </template>
    <slot />
    <AppToaster />
  </AppShell>

  <AppPublicShell v-else>
    <template #brand>
      <RouterLink to="/" class="inline-flex"><AppBrand :name="messages.app.name" /></RouterLink>
    </template>
    <template #actions>
      <AppButton variant="ghost" compact @click="router.push('/sign-in')">{{ t.signIn }}</AppButton>
      <AppButton compact @click="router.push('/sign-up')">{{ t.signUp }}</AppButton>
    </template>
    <slot />
    <template #footer>{{ t.footer }}</template>
    <AppToaster />
  </AppPublicShell>
</template>
