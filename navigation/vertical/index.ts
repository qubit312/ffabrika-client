export default [
  {
    title: 'Товары',
    icon: { icon: 'tabler-box' },
    children: [
      { title: 'Список', to: 'product-list' },
      { title: 'Подробности', to: { name: 'product-details-id', params: { id: '0' } }},
    ],
  },
  {
    title: 'Маркировка',
    icon: { icon: 'tabler-barcode' },
    children: [
      { title: 'Список', to: 'marking-list' },
      { title: 'Подробности', to: { name: 'marking-details-id', params: { id: '0' } }},
    ],
  },
  {
    title: 'Клиенты',
    icon: { icon: 'tabler-users' },
    children: [
      { title: 'Список', to: 'client-list' },
      { title: 'Подробности', to: { name: 'client-details-id', params: { id: '0' } }},
    ],
  },
]
