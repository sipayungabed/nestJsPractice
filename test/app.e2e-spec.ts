import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ItemCategory, TestUtils } from './utils/test.util';

describe('GET /cart', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  function makeHttpRequest() {
    return request(app.getHttpServer());
  }

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await makeHttpRequest().delete('/cart').send();
  });

  it(`[1] should return 200 OK with 'CART_IS_EMPTY' message given cart items is empty`, async () => {
    await makeHttpRequest().get('/cart').send().expect(200).expect({
      message: 'CART_IS_EMPTY',
    });
  });

  it('[1] should calculate total price and total correctly', async () => {
    const cartItems = [
      TestUtils.getRandomCartItem({
        name: 'item1',
        price: 5000,
        qty: 2,
      }),
      TestUtils.getRandomCartItem({
        name: 'item2',
        price: 20000,
        qty: 2,
      }),
      TestUtils.getRandomCartItem({
        name: 'item3',
        price: 30000,
        qty: 3,
      }),
      TestUtils.getRandomCartItem({
        name: 'Item1',
        price: 10000,
        qty: 1,
      }),
      TestUtils.getRandomCartItem({
        name: 'ItEm2',
        price: 20000,
        qty: 0,
      }),
      TestUtils.getRandomCartItem({
        name: 'ItEM3',
        price: 30000,
        qty: 4,
      }),
    ];
    await TestUtils.putCartItems(app.getHttpServer(), cartItems);

    await makeHttpRequest().get('/cart').send().expect(200).expect({
      total_price: 130000,
      total_discount: 0,
      total: 130000,
    });
  });

  describe('with exclusive voucher', () => {
    it('[1] should apply voucher discount given that the voucher target item quantity meets the minimum quantity', async () => {
      const item = {
        name: 'mie instan',
        category: ItemCategory.MakananBekuOlahan,
        qty: 10,
        price: 10000,
      };
      await TestUtils.putCartItems(app.getHttpServer(), [
        item,
        { ...TestUtils.getRandomCartItem(), price: 1000, qty: 5 },
      ]);

      await makeHttpRequest().post('/cart/vouchers').send({
        code: 'EKS-MieInstan-x10y13z20',
      });

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 105000,
        total_discount: 20000,
        total: 85000,
      });
    });

    it('[2] should limit the discount to the maximum quantity given that the voucher target item quantity exceeds the maximum allowed', async () => {
      const item = {
        name: 'mie instan',
        category: ItemCategory.MakananBekuOlahan,
        qty: 50,
        price: 10000,
      };
      await TestUtils.putCartItems(app.getHttpServer(), [
        item,
        { ...TestUtils.getRandomCartItem(), price: 1000, qty: 10 },
      ]);

      await makeHttpRequest().post('/cart/vouchers').send({
        code: 'EKS-MieInstan-x20y30z50',
      });

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 510000,
        total_discount: 150000,
        total: 360000,
      });
    });

    it('[2] should apply the voucher with the highest total discount given that multiple exclusive vouchers are applicable to the same item', async () => {
      const item = {
        name: 'mie instan',
        category: ItemCategory.MakananBekuOlahan,
        qty: 50,
        price: 10000,
      };
      await TestUtils.putCartItems(app.getHttpServer(), [
        item,
        { ...TestUtils.getRandomCartItem(), price: 5000, qty: 20 },
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'EKS-MieInstan-x10y50z10',
        'EKS-MieInstan-x20y30z20',
        'EKS-MieInstan-x30y45z18',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 600000,
        total_discount: 81000,
        total: 519000,
      });
    });

    it('[2] should accumulate voucher discounts given that multiple exclusive vouchers are applicable to different items', async () => {
      const items = [
        {
          name: 'mie instan',
          category: ItemCategory.MakananBekuOlahan,
          qty: 50,
          price: 10000,
        },
        {
          name: 'gula pasir',
          category: ItemCategory.MakananBekuOlahan,
          qty: 20,
          price: 5000,
        },
      ];
      await TestUtils.putCartItems(app.getHttpServer(), [
        ...items,
        { ...TestUtils.getRandomCartItem(), price: 15000, qty: 8 },
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'EKS-MieInstan-x10y25z30',
        'EKS-GulaPasir-x10y20z20',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 720000,
        total_discount: 95000,
        total: 625000,
      });
    });
  });

  describe('with item regular voucher', () => {
    it('[2] should not apply voucher given that an exclusive voucher has already been applied to the item', async () => {
      const item = {
        name: 'mie instan',
        category: ItemCategory.MakananBekuOlahan,
        qty: 10,
        price: 10000,
      };
      await TestUtils.putCartItems(app.getHttpServer(), [
        item,
        { ...TestUtils.getRandomCartItem(), price: 1000, qty: 5 },
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'EKS-MieInstan-x10y13z20',
        'REG-MieInstan-z10',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 105000,
        total_discount: 20000,
        total: 85000,
      });
    });

    it('[2] should apply voucher discount to the remaining quantity given that some quantity of the item has already been applied with an exclusive voucher', async () => {
      const item = {
        name: 'mie instan',
        category: ItemCategory.MakananBekuOlahan,
        qty: 15,
        price: 10000,
      };
      await TestUtils.putCartItems(app.getHttpServer(), [
        item,
        { ...TestUtils.getRandomCartItem(), price: 1000, qty: 5 },
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'EKS-MieInstan-x10y13z25',
        'REG-MieInstan-z5',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 155000,
        total_discount: 33500,
        total: 121500,
      });
    });

    it('[2] should accumulate voucher discount given that multiple vouchers applicable to the same item', async () => {
      const item = {
        name: 'mie instan',
        category: ItemCategory.MakananBekuOlahan,
        qty: 15,
        price: 10000,
      };
      await TestUtils.putCartItems(app.getHttpServer(), [
        item,
        { ...TestUtils.getRandomCartItem(), price: 1000, qty: 5 },
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'REG-MieInstan-z1',
        'REG-MieInstan-z2',
        'REG-MieInstan-z3',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 155000,
        total_discount: 9000,
        total: 146000,
      });
    });

    it('[2] should accumulate voucher discount given that multiple vouchers applicable to different items', async () => {
      const items = [
        {
          name: 'mie instan',
          category: ItemCategory.MakananBekuOlahan,
          qty: 15,
          price: 10000,
        },
        {
          name: 'gula pasir',
          category: ItemCategory.MakananBekuOlahan,
          qty: 20,
          price: 5000,
        },
      ];
      await TestUtils.putCartItems(app.getHttpServer(), [
        ...items,
        { ...TestUtils.getRandomCartItem(), price: 15000, qty: 8 },
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), ['REG-MieInstan-z5', 'REG-GulaPasir-z10']);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 370000,
        total_discount: 17500,
        total: 352500,
      });
    });
  });

  describe('with category regular voucher', () => {
    it('[1] should apply a voucher to all items in specific category', async () => {
      await TestUtils.putCartItems(app.getHttpServer(), [
        TestUtils.getRandomCartItem({ qty: 5, price: 10000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({ qty: 8, price: 15000, category: ItemCategory.RumahTangga }),
        TestUtils.getRandomCartItem({ qty: 10, price: 8000, category: ItemCategory.SnackEskrim }),
        TestUtils.getRandomCartItem({ qty: 3, price: 23000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({ qty: 1, price: 99999, category: ItemCategory.RumahTangga }),
      ]);

      await makeHttpRequest().post('/cart/vouchers').send({
        code: 'REG-RumahTangga-z10',
      });

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 418999,
        total_discount: 21999,
        total: 397000,
      });
    });

    it('[2] should apply voucher discount to the remaining quantity given that some quantity of the item has already been applied with an exclusive voucher', async () => {
      await TestUtils.putCartItems(app.getHttpServer(), [
        TestUtils.getRandomCartItem({ qty: 5, price: 10000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({ qty: 8, price: 15000, category: ItemCategory.RumahTangga }),
        TestUtils.getRandomCartItem({ qty: 10, price: 8000, category: ItemCategory.SnackEskrim }),
        TestUtils.getRandomCartItem({ qty: 3, price: 23000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({
          name: 'humidifier 1 liter',
          qty: 15,
          price: 99999,
          category: ItemCategory.RumahTangga,
        }),
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'EKS-Humidifier1Liter-x10y10z15',
        'REG-RumahTangga-z5',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 1818985,
        total_discount: 180998,
        total: 1637987,
      });
    });

    it('[2] should accumulate voucher discount given that multiple vouchers applicable to the same categories', async () => {
      await TestUtils.putCartItems(app.getHttpServer(), [
        TestUtils.getRandomCartItem({ qty: 5, price: 10000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({ qty: 8, price: 15000, category: ItemCategory.RumahTangga }),
        TestUtils.getRandomCartItem({ qty: 10, price: 8000, category: ItemCategory.SnackEskrim }),
        TestUtils.getRandomCartItem({ qty: 3, price: 23000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({
          name: 'humidifier 1 liter',
          qty: 15,
          price: 99999,
          category: ItemCategory.RumahTangga,
        }),
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'REG-RumahTangga-z1',
        'REG-RumahTangga-z2',
        'REG-RumahTangga-z3',
        'REG-Humidifier1Liter-z5',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 1818985,
        total_discount: 172198,
        total: 1646787,
      });
    });

    it('[2] should accumulate voucher discount given that multiple vouchers applicable to different categories', async () => {
      await TestUtils.putCartItems(app.getHttpServer(), [
        TestUtils.getRandomCartItem({ qty: 5, price: 10000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({ qty: 8, price: 15000, category: ItemCategory.RumahTangga }),
        TestUtils.getRandomCartItem({ qty: 10, price: 8000, category: ItemCategory.SnackEskrim }),
        TestUtils.getRandomCartItem({ qty: 3, price: 23000, category: ItemCategory.RokokObat }),
        TestUtils.getRandomCartItem({
          name: 'humidifier 1 liter',
          qty: 15,
          price: 99999,
          category: ItemCategory.RumahTangga,
        }),
      ]);

      await TestUtils.addVouchers(app.getHttpServer(), [
        'REG-RumahTangga-z1',
        'REG-RumahTangga-z2',
        'REG-RumahTangga-z3',
        'REG-Humidifier1Liter-z5',
      ]);

      await makeHttpRequest().get('/cart').send().expect(200).expect({
        total_price: 1818985,
        total_discount: 172198,
        total: 1646787,
      });
    });
  });
});
