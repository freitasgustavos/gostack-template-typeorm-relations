import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
  product_id: string;
  price: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer invalid');
    }

    const allDbProducts = await this.productsRepository.findAllById(products);
    const savingProducts = [...products];

    if (allDbProducts.length < products.length) {
      throw new AppError('One of the products are invalid');
    }

    const newQuantititiesArray = [];
    for (let i = 0; i < products.length; i += 1) {
      newQuantititiesArray[i] = {
        id: allDbProducts[i].id,
        quantity: allDbProducts[i].quantity - products[i].quantity,
      };

      savingProducts[i].price = allDbProducts[i].price;
      savingProducts[i].product_id = allDbProducts[i].id;

      if (newQuantititiesArray[i].quantity < 0) {
        throw new AppError(
          'Insufficient items inside the storage at this moment',
        );
      }
    }

    const order = await this.ordersRepository.create({
      customer,
      products: savingProducts,
    });

    await this.productsRepository.updateQuantity(newQuantititiesArray);

    return order;
  }
}

export default CreateOrderService;
