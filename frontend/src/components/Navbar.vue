<template lang="">
	<header class="flex justify-between gap-3 items-center px-5 py-2.5 h-12 border-b">
		<h3 class="cursor-pointer
		">{{ currentRoute }}</h3>
		<div class="flex flex-row gap-2">
			<BellDot class="cursor-pointer mr-2" />
		</div>
	</header>
</template>
<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {BellDot } from 'lucide-vue-next';

const router = useRouter();

const currentRoute = computed(() => router.currentRoute.value.name)


</script>
<style lang="">
	
</style>