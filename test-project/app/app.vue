<template>
    <div>
        <NuxtRouteAnnouncer />

        <h1>Test IconComplete</h1>

        <!-- Place your cursor after 'svg' and type '#' -->
        <svg class="icon">
            <use href="/icons/icons.svg" />
        </svg>

        <!-- With existing icon -->
        <svg class="icon">
            <use href="/icons/icons.svg#home" />
        </svg>
    </div>
</template>
