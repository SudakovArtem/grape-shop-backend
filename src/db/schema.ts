import { pgTable, serial, varchar, timestamp, text, decimal, integer, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
})

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  cuttingPrice: decimal('cutting_price', { precision: 10, scale: 2 }),
  seedlingPrice: decimal('seedling_price', { precision: 10, scale: 2 }),
  categoryId: integer('category_id').references(() => categories.id),
  variety: varchar('variety', { length: 255 }), // Дублирует name для совместимости (согласно ТЗ)
  maturationPeriod: varchar('maturation_period', { length: 50 }),
  berryShape: varchar('berry_shape', { length: 50 }),
  color: varchar('color', { length: 50 }),
  taste: varchar('taste', { length: 50 }),
  cuttingInStock: integer('cutting_in_stock').default(0),
  seedlingInStock: integer('seedling_in_stock').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
  s3FileKey: varchar('s3_file_key', { length: 255 }).notNull(), // Ключ файла в S3
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow()
})

export const userRoleEnum = pgEnum('user_role_enum', ['user', 'admin'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  avatar: varchar('avatar', { length: 512 }), // Новое поле для URL аватара
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }), // Хэшированный токен
  resetPasswordExpires: timestamp('reset_password_expires') // Время истечения токена
})

export const carts = pgTable('carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  guestId: varchar('guest_id', { length: 255 }), // Для неавторизованных пользователей
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'cutting' or 'seedling'
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').defaultNow()
  // total_price в ТЗ указан для корзины, но обычно он рассчитывается на лету или при оформлении заказа.
  // Пока не будем его добавлять в таблицу carts, чтобы избежать денормализации и необходимости обновлять его при каждом изменении.
  // Если потребуется, можно будет добавить позже или рассчитывать в сервисе.
})

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  guestId: varchar('guest_id', { length: 255 }), // Для неавторизованных пользователей
  guestEmail: varchar('guest_email', { length: 255 }), // Email гостя для уведомлений
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // "Создан", "В обработке", "Отправлен", "Доставлен", "Отменен"
  createdAt: timestamp('created_at').defaultNow()
})

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'cutting' or 'seedling'
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull() // Цена за единицу на момент заказа
})

export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id), // Может быть NULL для гостевых действий
  action: varchar('action', { length: 255 }).notNull(),
  additionalData: text('additional_data'), // JSON-строка для дополнительных данных
  timestamp: timestamp('timestamp').defaultNow()
})

export const articleCategories = pgTable('article_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
})

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  imageUrl: varchar('image_url', { length: 512 }),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  authorId: integer('author_id').references(() => users.id),
  categoryId: integer('category_id').references(() => articleCategories.id),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const paymentStatusEnum = pgEnum('payment_status_enum', [
  'pending',
  'waiting_for_capture',
  'succeeded',
  'canceled'
])

// Таблица для хранения сессий гостевых пользователей
export const guestSessions = pgTable('guest_sessions', {
  id: serial('id').primaryKey(),
  guestId: varchar('guest_id', { length: 255 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }), // Поддержка IPv6
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull() // Время истечения сессии (например, 30 дней)
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  yookassaPaymentId: varchar('yookassa_payment_id', { length: 255 }).notNull().unique(), // ID платежа в YooKassa
  orderId: integer('order_id').references(() => orders.id),
  userId: integer('user_id').references(() => users.id),
  guestId: varchar('guest_id', { length: 255 }), // Для неавторизованных пользователей
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('RUB'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paid: boolean('paid').default(false),
  description: text('description'),
  confirmationUrl: varchar('confirmation_url', { length: 512 }), // URL для подтверждения платежа
  metadata: text('metadata'), // JSON строка с метаданными
  test: boolean('test').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})
