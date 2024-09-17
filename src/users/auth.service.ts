import { Injectable, BadRequestException } from '@nestjs/common';
import { AddItemDto } from './dto/add-item.dto';
import { ApplyVoucherDto } from './dto/voucher.dto';
import { CartDto } from './dto/cart.dto';
import { compactName } from '../common/utils/compact-name.util';

@Injectable()
export class CartService {
  private cart: CartDto = {
    items: [],
    total_price: 0,
    total_discount: 0,
    total: 0,
  };

  addItem(addItemDto: AddItemDto) {
    const { name, qty, price, category } = addItemDto;

    const existingItem = this.cart.items.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingItem) {
      // Replace item attributes if already in the cart
      existingItem.qty = qty;
      existingItem.price = price;
      existingItem.category = category;
      existingItem.discount = 0;
    } else {
      // Add new item to cart
      this.cart.items.push({ name, qty, price, category, discount: 0 });
    }

    this.updateCartTotal();
  }

  applyVoucher(voucher: ApplyVoucherDto) {
    const code = voucher.code;

    if (code.startsWith('EKS-')) {
      this.handleExclusiveVoucher(code);
    } else if (code.startsWith('REG-')) {
      this.handleRegularVoucher(code);
    } else {
      throw new BadRequestException('Invalid voucher format');
    }
  }

  private handleExclusiveVoucher(code: string) {
    const parts = code.split('-');
    if (parts.length !== 4) {
      throw new BadRequestException('Invalid exclusive voucher format');
    }

    const itemName = parts[1];
    const minQty = parseInt(parts[2].split('x')[1]);
    const maxQty = parseInt(parts[2].split('y')[1]);
    const discount = parseInt(parts[3].replace('z', ''));

    const compactedItemName = compactName(itemName);

    const item = this.cart.items.find(
      (i) => compactName(i.name) === compactedItemName,
    );

    if (item && item.qty >= minQty) {
      const applicableQty = Math.min(item.qty, maxQty);
      const discountAmount = Math.floor((applicableQty * item.price * discount) / 100);
      item.discount = discountAmount; // Exclusive vouchers should replace any existing discount
      this.updateCartTotal();
    }
  }

  private handleRegularVoucher(code: string) {
    const parts = code.split('-');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid regular voucher format');
    }

    const itemOrCategory = parts[1];
    const discount = parseInt(parts[2].replace('z', ''));

    const compactedItemOrCategory = compactName(itemOrCategory);

    this.cart.items.forEach((item) => {
      if (
        compactName(item.name) === compactedItemOrCategory ||  // Item-specific voucher
        compactName(item.category) === compactedItemOrCategory // Category-specific voucher
      ) {
        const discountAmount = Math.floor((item.price * item.qty * discount) / 100);
        item.discount += discountAmount; // Accumulate regular voucher discounts
      }
    });

    this.updateCartTotal();
  }

  getCartTotal() {
    if (this.cart.items.length === 0) {
      return { message: 'CART_IS_EMPTY' };
    }

    return {
      total_price: this.cart.total_price​⬤