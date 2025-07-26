import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductModule } from '../../module/product/product.module';
import { SalesModule } from '../../module/sales/sales.module';
import { ProductService } from '../../service/product.service';
import { SalesService } from '../../service/sales.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  faUser, faCalendarAlt, faBox, faSortNumericDown, faDollarSign,
  faWarehouse, faTrash, faPlus, faCartPlus, faSave
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-updatesales',
  templateUrl: './updatesales.component.html',
  styleUrls: ['./updatesales.component.css']
})
export class UpdatesalesComponent implements OnInit {

  products: ProductModule[] = [];
  salesForm!: FormGroup;
  sale: SalesModule = new SalesModule();
  saleId!: string;

  // Icons
  faUser = faUser;
  faCalendarAlt = faCalendarAlt;
  faBox = faBox;
  faSortNumericDown = faSortNumericDown;
  faDollarSign = faDollarSign;
  faWarehouse = faWarehouse;
  faTrash = faTrash;
  faPlus = faPlus;
  faCartPlus = faCartPlus;
  faSave = faSave;

  constructor(
    private productService: ProductService,
    private salesService: SalesService,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.saleId = this.route.snapshot.params['id'];

    // Initialize form first
    this.salesForm = this.formBuilder.group({
      customername: ['', Validators.required],
      salesdate: ['', Validators.required],
      products: this.formBuilder.array([]),
      totalprice: ['']
    });

    this.loadProduct();
    this.loadSale();
  }

  get productsArray(): FormArray {
    return this.salesForm.get('products') as FormArray;
  }

  loadProduct() {
    this.productService.getAllProductForSales().subscribe({
      next: res => {
        this.products = res;
      },
      error: error => {
        console.error('Error fetching products', error);
      }
    });
  }

  loadSale() {
    this.salesService.getSalesById(this.saleId).subscribe({
      next: res => {
        this.sale = res;
        this.populateForm();
      },
      error: error => {
        console.error('Error fetching sale details', error);
      }
    });
  }

  populateForm() {
    this.salesForm.patchValue({
      customername: this.sale.customername,
      salesdate: this.sale.salesdate
    });

    this.sale.product.forEach(prod => {
      const productGroup = this.formBuilder.group({
        id: [prod.id],
        name: [prod.name, Validators.required],
        quantity: [prod.quantity, Validators.required],
        unitprice: [prod.unitprice],
        stock: [prod.stock]
      });

      productGroup.get('quantity')?.valueChanges.subscribe(() => {
        this.validateStock(productGroup);
        this.calculateTotalPrice();
      });

      this.productsArray.push(productGroup);
    });

    this.calculateTotalPrice();
  }

  addProduct() {
    const productGroup = this.formBuilder.group({
      id: [''],
      name: ['', Validators.required],
      quantity: [{ value: 0, disabled: true }, Validators.required],
      unitprice: [0],
      stock: [0]
    });

    productGroup.get('name')?.valueChanges.subscribe(name => {
      const selectedProduct = this.products.find(p => p.name === name);
      if (selectedProduct) {
        const stock = selectedProduct.stock;
        productGroup.patchValue({
          id: selectedProduct.id,
          unitprice: selectedProduct.unitprice,
          stock: stock
        });

        if (stock > 0) {
          productGroup.get('quantity')?.enable();
        } else {
          productGroup.patchValue({ quantity: 0 });
          productGroup.get('quantity')?.disable();
          alert(`Product ${selectedProduct.name} is out of stock.`);
        }
        this.calculateTotalPrice();
      }
    });

    productGroup.get('quantity')?.valueChanges.subscribe(() => {
      this.validateStock(productGroup);
      this.calculateTotalPrice();
    });

    this.productsArray.push(productGroup);
  }

  removeProduct(index: number) {
    this.productsArray.removeAt(index);
    this.calculateTotalPrice();
  }

  validateStock(productGroup: FormGroup) {
    const quantity = productGroup.get('quantity')?.value || 0;
    const stock = productGroup.get('stock')?.value || 0;
    if (quantity > stock) {
      alert(`Selected quantity exceeds stock (${stock}).`);
      productGroup.patchValue({ quantity: stock });
    }
  }

  calculateTotalPrice() {
    const total = this.productsArray.controls.reduce((sum, control) => {
      const qty = control.get('quantity')?.value || 0;
      const price = control.get('unitprice')?.value || 0;
      return sum + qty * price;
    }, 0);

    this.salesForm.patchValue({ totalprice: total });
  }

  updateSales() {
    const rawForm = this.salesForm.getRawValue();

    this.sale.customername = rawForm.customername;
    this.sale.salesdate = rawForm.salesdate;
    this.sale.totalprice = rawForm.totalprice;

    this.sale.product = rawForm.products.map((product: any) => {
      const originalProduct = this.products.find(p => p.id === product.id);
      if (originalProduct) {
        originalProduct.stock -= product.quantity;
      }

      return {
        id: originalProduct?.id,
        name: originalProduct?.name,
        photo: originalProduct?.photo,
        stock: originalProduct?.stock,
        unitprice: originalProduct?.unitprice,
        quantity: product.quantity
      };
    });

    this.salesService.updateSales(this.saleId, this.sale).subscribe({
      next: () => {
        this.sale.product.forEach(prod => {
          this.productService.updateProducts(prod).subscribe({
            next: () => console.log(`Updated stock for product ${prod.id}`),
            error: err => console.error('Stock update error', err)
          });
        });
        this.router.navigate(['viewsales']);
      },
      error: error => {
        console.error('Sales update failed', error);
      }
    });
  }

  get totalPrice(): number {
    return this.productsArray.controls.reduce((total, control) => {
      const quantity = control.get('quantity')?.value || 0;
      const unitprice = control.get('unitprice')?.value || 0;
      return total + quantity * unitprice;
    }, 0);
  }
}
