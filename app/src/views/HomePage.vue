<template>
  <div class="h-full min-h-0 flex flex-col overflow-hidden">
    <AppHeader ref="appHeaderRef" :scrolled="headerCompact" />

    <div class="flex-1 flex flex-col min-h-0 w-full mx-auto p-0 relative">
      <main
        ref="mainScrollRef"
        class="relative overflow-y-auto w-full box-border px-4"
        :style="{ paddingTop: `${headerHeight}px`, paddingBottom: `${BOTTOM_CLEARANCE_GAP}px` }"
        @scroll.passive="handleMainScroll"
      >
        <SubmitRun @submitted="handleRunSubmitted" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, inject, provide } from 'vue';
import SubmitRun from '@/components/SubmitRun.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { useDataStore } from '@/composables/useDataStore';
import { preloadAutorunPingMeta } from '@/sdk/autorun';

const { fetchUserData, userInfo } = useDataStore();
const rootShowMessage = inject('showMessage', null);

const appHeaderRef = ref(null);
const mainScrollRef = ref(null);
const HEADER_RESERVED_SPACE = 56;
const BOTTOM_CLEARANCE_GAP = 24;
const headerHeight = ref(HEADER_RESERVED_SPACE);
const headerCompact = ref(false);

function updateHeaderCompact(top) {
  const next = Number(top) > 6;
  if (next === headerCompact.value) return;
  headerCompact.value = next;
}

function handleMainScroll(event) {
  updateHeaderCompact(event?.target?.scrollTop || 0);
}

function showMessage(message, type = 'info') {
  if (appHeaderRef.value?.show) {
    appHeaderRef.value.show(message, type);
    return;
  }

  if (typeof rootShowMessage === 'function') {
    rootShowMessage(message, type);
  }
}

async function refreshUserData(options = { background: true }) {
  if (!userInfo.value) return true;

  const result = await fetchUserData(options);
  if (result?.ok) return true;

  if (result?.reason === 'network_error') {
    showMessage('用户数据刷新失败', 'warning');
    return false;
  }

  showMessage(result?.message || '登录状态校验失败', 'error');
  return false;
}

async function initializePage() {
  await refreshUserData({ background: false });
  await preloadAutorunPingMeta();
}

async function handleRunSubmitted() {
  await refreshUserData({ background: true });
}

provide('showMessage', showMessage);

onMounted(() => {
  initializePage().catch(() => {
    showMessage('用户数据刷新失败', 'warning');
  });

  nextTick(() => {
    updateHeaderCompact(mainScrollRef.value?.scrollTop || 0);
  });
});
</script>
