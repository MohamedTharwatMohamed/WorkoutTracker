export const strings = {
  appName: 'Workout Tracker',
  install: {
    title: 'Install the app',
    iosSteps: [
      'Tap the Share button in Safari.',
      'Choose "Add to Home Screen".',
      'Open Workout Tracker from your home screen.',
    ],
    androidSteps: ['Tap "Install" below, or open the browser menu and choose "Install app".'],
    install: 'Install',
    continueInBrowser: 'Continue in browser',
  },
  tabWarning:
    'You are using the browser tab. Data here is separate from the installed app and the browser may delete it. Install the app and back up often.',
  measureHints: {
    weight: 'Morning, after the toilet, before eating, same scale.',
    waist: 'At the navel, relaxed, after breathing out.',
    hips: 'Around the widest part of the buttocks, feet together.',
    chest: 'Under the armpits, across the nipples, arms down.',
    neck: 'Just below the larynx, tape level.',
    arm: 'Around the widest part of the upper arm, relaxed.',
    thigh: 'Around the widest part of the thigh, standing.',
    calf: 'Around the widest part of the calf, standing.',
  },
} as const;
