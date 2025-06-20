export default [
  {
    title: 'Маркировка',
    icon: { icon: 'tabler-school' },
    children: [
      { title: 'Список', to: 'marking-list' },
      { title: 'Подробности', to: { name: 'marking-details-id', params: { id: '0' } }},
    ],
  },
]
