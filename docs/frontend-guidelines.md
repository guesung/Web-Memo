# 프론트엔드 설계 가이드

이 문서는 프론트엔드 설계의 핵심 원칙과 규칙을 정리하고 권장 패턴을 제시합니다.
프론트엔드 코드를 작성할 때 이 가이드를 따르세요.

> 출처: 토스 프론트엔드 설계 가이드(기존 `.cursor/rules/toss-frontend-rules.mdc`)를 단일화하면서 이전한 문서입니다.

# 가독성 (Readability)

코드를 더 명확하고 이해하기 쉽게 만듭니다.

## 매직 넘버에 이름 붙이기

**규칙:** 매직 넘버는 이름 있는 상수로 대체합니다.

**이유:**

- 설명되지 않은 값에 의미를 부여해 명확성을 높입니다.
- 유지보수성이 좋아집니다.

#### 권장 패턴:

```typescript
const ANIMATION_DELAY_MS = 300;

async function onLikeClick() {
  await postLike(url);
  await delay(ANIMATION_DELAY_MS); // 애니메이션을 기다린다는 의도가 분명히 드러남
  await refetchPostLike();
}
```

## 구현 세부사항 추상화하기

**규칙:** 복잡한 로직/인터랙션은 전용 컴포넌트나 HOC로 추상화합니다.

**이유:**

- 관심사를 분리해 인지 부하를 줄입니다.
- 컴포넌트의 가독성·테스트 용이성·유지보수성이 좋아집니다.

#### 권장 패턴 1: Auth Guard

(로그인 확인 로직을 래퍼/가드 컴포넌트로 추상화)

```tsx
// 앱 구조
function App() {
  return (
    <AuthGuard>
      {" "}
      {/* 래퍼가 인증 확인을 담당 */}
      <LoginStartPage />
    </AuthGuard>
  );
}

// AuthGuard 컴포넌트가 확인/리다이렉트 로직을 캡슐화
function AuthGuard({ children }) {
  const status = useCheckLoginStatus();
  useEffect(() => {
    if (status === "LOGGED_IN") {
      location.href = "/home";
    }
  }, [status]);

  // 로그인 상태가 아닐 때만 children을 렌더링, 아니면 null(또는 로딩)을 렌더링
  return status !== "LOGGED_IN" ? children : null;
}

// LoginStartPage는 이제 로그인 UI/로직에만 집중하는 단순한 컴포넌트가 됨
function LoginStartPage() {
  // ... 로그인 관련 로직만 ...
  return <>{/* ... 로그인 관련 컴포넌트들 ... */}</>;
}
```

#### 권장 패턴 2: 전용 인터랙션 컴포넌트

(다이얼로그 로직을 전용 `InviteButton` 컴포넌트로 추상화)

```tsx
export function FriendInvitation() {
  const { data } = useQuery(/* ... */);

  return (
    <>
      {/* 전용 버튼 컴포넌트를 사용 */}
      <InviteButton name={data.name} />
      {/* ... 그 외 UI ... */}
    </>
  );
}

// InviteButton이 확인 플로우를 내부에서 처리
function InviteButton({ name }) {
  const handleClick = async () => {
    const canInvite = await overlay.openAsync(({ isOpen, close }) => (
      <ConfirmDialog
        title={`Share with ${name}`}
        // ... 다이얼로그 설정 ...
      />
    ));

    if (canInvite) {
      await sendPush();
    }
  };

  return <Button onClick={handleClick}>Invite</Button>;
}
```

## 조건부 렌더링의 코드 경로 분리하기

**규칙:** 서로 크게 다른 조건부 UI/로직은 별개의 컴포넌트로 분리합니다.

**이유:**

- 하나의 컴포넌트 안에 복잡한 조건문이 쌓이는 것을 막아 가독성이 좋아집니다.
- 각 전용 컴포넌트가 명확한 단일 책임을 갖게 됩니다.

#### 권장 패턴:

(역할별로 컴포넌트를 분리)

```tsx
function SubmitButton() {
  const isViewer = useRole() === "viewer";

  // 렌더링을 전용 컴포넌트에 위임
  return isViewer ? <ViewerSubmitButton /> : <AdminSubmitButton />;
}

// 'viewer' 역할 전용 컴포넌트
function ViewerSubmitButton() {
  return <TextButton disabled>Submit</TextButton>;
}

// 'admin'(또는 viewer가 아닌) 역할 전용 컴포넌트
function AdminSubmitButton() {
  useEffect(() => {
    showAnimation(); // 애니메이션 로직을 이곳에만 격리
  }, []);

  return <Button type="submit">Submit</Button>;
}
```

## 복잡한 삼항 연산자 단순화하기

**규칙:** 복잡하거나 중첩된 삼항 연산자는 `if`/`else`나 IIFE로 바꿉니다.

**이유:**

- 조건 로직을 빠르게 따라갈 수 있습니다.
- 전반적인 코드 유지보수성이 좋아집니다.

#### 권장 패턴:

(`if` 문을 사용하는 IIFE)

```typescript
const status = (() => {
  if (ACondition && BCondition) return "BOTH";
  if (ACondition) return "A";
  if (BCondition) return "B";
  return "NONE";
})();
```

## 시선 이동 줄이기 (단순 로직 코로케이션)

**규칙:** 단순하고 지역적인 로직은 사용하는 곳 가까이에 두거나 인라인으로
정의해 컨텍스트 전환을 줄입니다.

**이유:**

- 위에서 아래로 읽으며 빠르게 이해할 수 있습니다.
- 컨텍스트 전환(시선 이동)으로 인한 인지 부하를 줄입니다.

#### 권장 패턴 A: 인라인 `switch`

```tsx
function Page() {
  const user = useUser();

  // 로직이 이 자리에서 바로 보임
  switch (user.role) {
    case "admin":
      return (
        <div>
          <Button disabled={false}>Invite</Button>
          <Button disabled={false}>View</Button>
        </div>
      );
    case "viewer":
      return (
        <div>
          <Button disabled={true}>Invite</Button> {/* viewer용 예시 */}
          <Button disabled={false}>View</Button>
        </div>
      );
    default:
      return null;
  }
}
```

#### 권장 패턴 B: 가까이 정의한 단순 정책 객체

```tsx
function Page() {
  const user = useUser();
  // 단순한 정책을 바로 이 자리에 정의해 한눈에 보이도록 함
  const policy = {
    admin: { canInvite: true, canView: true },
    viewer: { canInvite: false, canView: true },
  }[user.role];

  // role이 일치하지 않을 수 있다면 프로퍼티 접근 전에 policy 존재 여부를 확인
  if (!policy) return null;

  return (
    <div>
      <Button disabled={!policy.canInvite}>Invite</Button>
      <Button disabled={!policy.canView}>View</Button>
    </div>
  );
}
```

## 복잡한 조건에 이름 붙이기

**규칙:** 복잡한 불리언 조건은 이름 있는 변수에 담습니다.

**이유:**

- 조건의 _의미_ 가 명시적으로 드러납니다.
- 인지 부하를 줄여 가독성과 자기 문서화 수준이 높아집니다.

#### 권장 패턴:

(조건을 이름 있는 변수에 할당)

```typescript
const matchedProducts = products.filter((product) => {
  // 상품이 대상 카테고리에 속하는지 확인
  const isSameCategory = product.categories.some(
    (category) => category.id === targetCategory.id
  );

  // 상품 가격 중 원하는 범위에 들어오는 것이 있는지 확인
  const isPriceInRange = product.prices.some(
    (price) => price >= minPrice && price <= maxPrice
  );

  // 전체 조건이 훨씬 명확해짐
  return isSameCategory && isPriceInRange;
});
```

**가이드:** 로직이 복잡하거나, 재사용되거나, 단위 테스트가 필요할 때 조건에 이름을
붙이세요. 아주 단순하고 한 번만 쓰이는 조건에는 굳이 이름을 붙이지 않습니다.

# 예측 가능성 (Predictability)

이름·인자·맥락으로부터 기대하는 대로 코드가 동작하게 만듭니다.

## 반환 타입 표준화하기

**규칙:** 비슷한 성격의 함수/훅은 일관된 반환 타입을 사용합니다.

**이유:**

- 반환값의 형태를 미리 예상할 수 있어 예측 가능성이 높아집니다.
- 타입이 제각각일 때 생기는 혼란과 오류를 줄입니다.

#### 권장 패턴 1: API 훅 (React Query)

```typescript
// 항상 Query 객체를 반환
import { useQuery, UseQueryResult } from "@tanstack/react-query";

// fetchUser가 Promise<UserType>을 반환한다고 가정
function useUser(): UseQueryResult<UserType, Error> {
  const query = useQuery({ queryKey: ["user"], queryFn: fetchUser });
  return query;
}

// fetchServerTime이 Promise<Date>를 반환한다고 가정
function useServerTime(): UseQueryResult<Date, Error> {
  const query = useQuery({
    queryKey: ["serverTime"],
    queryFn: fetchServerTime,
  });
  return query;
}
```

#### 권장 패턴 2: 유효성 검사 함수

(일관된 타입, 가급적 판별 유니온(Discriminated Union)을 사용)

```typescript
type ValidationResult = { ok: true } | { ok: false; reason: string };

function checkIsNameValid(name: string): ValidationResult {
  if (name.length === 0) return { ok: false, reason: "Name cannot be empty." };
  if (name.length >= 20)
    return { ok: false, reason: "Name cannot be longer than 20 characters." };
  return { ok: true };
}

function checkIsAgeValid(age: number): ValidationResult {
  if (!Number.isInteger(age))
    return { ok: false, reason: "Age must be an integer." };
  if (age < 18) return { ok: false, reason: "Age must be 18 or older." };
  if (age > 99) return { ok: false, reason: "Age must be 99 or younger." };
  return { ok: true };
}

// ok가 false일 때만 'reason'에 안전하게 접근할 수 있음
const nameValidation = checkIsNameValid(name);
if (!nameValidation.ok) {
  console.error(nameValidation.reason);
}
```

## 숨겨진 로직 드러내기 (단일 책임)

**규칙:** 숨겨진 부수 효과를 만들지 않습니다. 함수는 시그니처가 암시하는 동작만
수행해야 합니다(SRP).

**이유:**

- 의도치 않은 부수 효과 없이 예측 가능하게 동작합니다.
- 관심사 분리(SRP)를 통해 더 견고하고 테스트하기 쉬운 코드가 됩니다.

#### 권장 패턴:

```typescript
// 이 함수는 잔액 조회'만' 수행
async function fetchBalance(): Promise<number> {
  const balance = await http.get<number>("...");
  return balance;
}

// 호출하는 쪽에서 필요한 곳에 명시적으로 로깅을 수행
async function handleUpdateClick() {
  const balance = await fetchBalance(); // 조회
  logging.log("balance_fetched"); // 로깅 (명시적 동작)
  await syncBalance(balance); // 또 다른 동작
}
```

## 고유하고 설명적인 이름 사용하기 (모호함 피하기)

**규칙:** 직접 만든 래퍼/함수에는 고유하고 설명적인 이름을 붙여 모호함을 없앱니다.

**이유:**

- 모호함을 없애고 예측 가능성을 높입니다.
- 이름만 보고도 특정 동작(예: 인증 추가)을 바로 파악할 수 있습니다.

#### 권장 패턴:

```typescript
// httpService.ts — 더 명확한 모듈 이름
import { http as httpLibrary } from "@some-library/http";

export const httpService = {
  // 고유한 모듈 이름
  async getWithAuth(url: string) {
    // 설명적인 함수 이름
    const token = await fetchToken();
    return httpLibrary.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// fetchUser.ts — 사용부에서 인증이 포함됨이 분명히 드러남
import { httpService } from "./httpService";
export async function fetchUser() {
  // 'getWithAuth'라는 이름이 동작을 명시적으로 드러냄
  return await httpService.getWithAuth("...");
}
```

# 응집도 (Cohesion)

관련된 코드를 함께 두고, 모듈이 잘 정의된 하나의 목적을 갖도록 합니다.

## 폼의 응집도 고려하기

**규칙:** 폼 요구사항에 따라 필드 단위 응집도와 폼 단위 응집도 중 하나를 선택합니다.

**이유:**

- 필드 독립성(필드 단위)과 폼 전체의 통일성(폼 단위) 사이의 균형을 잡습니다.
- 요구사항에 맞게 관련 폼 로직이 적절히 묶이도록 합니다.

#### 권장 패턴 (필드 단위 예시):

```tsx
// 각 필드가 자체 `validate` 함수를 사용
import { useForm } from "react-hook-form";

export function Form() {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    /* defaultValues 등 */
  });

  const onSubmit = handleSubmit((formData) => {
    console.log("Form submitted:", formData);
  });

  return (
    <form onSubmit={onSubmit}>
      <div>
        <input
          {...register("name", {
            validate: (value) =>
              value.trim() === "" ? "Please enter your name." : true, // 검증 예시
          })}
          placeholder="Name"
        />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      <div>
        <input
          {...register("email", {
            validate: (value) =>
              /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
                ? true
                : "Invalid email address.", // 검증 예시
          })}
          placeholder="Email"
        />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

#### 권장 패턴 (폼 단위 예시):

```tsx
// 하나의 스키마가 폼 전체의 검증을 정의
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Please enter your name."),
  email: z.string().min(1, "Please enter your email.").email("Invalid email."),
});

export function Form() {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = handleSubmit((formData) => {
    console.log("Form submitted:", formData);
  });

  return (
    <form onSubmit={onSubmit}>
      <div>
        <input {...register("name")} placeholder="Name" />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register("email")} placeholder="Email" />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

**가이드:** 독립적인 검증, 비동기 검사, 재사용 가능한 필드에는 **필드 단위**를
선택하세요. 서로 관련된 필드, 위저드 폼, 상호 의존적인 검증에는 **폼 단위**를
선택하세요.

## 기능/도메인 단위로 코드 구성하기

**규칙:** 디렉터리를 코드 종류가 아니라 기능/도메인 단위로 구성합니다.

**이유:**

- 관련 파일이 함께 모여 응집도가 높아집니다.
- 기능의 이해·개발·유지보수·삭제가 쉬워집니다.

#### 권장 패턴:

(기능/도메인 단위 구성)

```
src/
├── components/ # 공통 컴포넌트
├── hooks/      # 공통 훅
├── utils/      # 공통 유틸
├── domains/
│   ├── user/
│   │   ├── components/
│   │   │   └── UserProfileCard.tsx
│   │   ├── hooks/
│   │   │   └── useUser.ts
│   │   └── index.ts # 배럴 파일(선택)
│   ├── product/
│   │   ├── components/
│   │   │   └── ProductList.tsx
│   │   ├── hooks/
│   │   │   └── useProducts.ts
│   │   └── ...
│   └── order/
│       ├── components/
│       │   └── OrderSummary.tsx
│       ├── hooks/
│       │   └── useOrder.ts
│       └── ...
└── App.tsx
```

## 매직 넘버를 관련 로직과 연결하기

**규칙:** 상수는 관련 로직 가까이에 정의하거나, 이름으로 관계가 분명히 드러나게
합니다.

**이유:**

- 상수를 그것이 나타내는 로직과 연결해 응집도를 높입니다.
- 로직만 바꾸고 관련 상수를 함께 바꾸지 않아 조용히 실패하는 상황을 막습니다.

#### 권장 패턴:

```typescript
// 이름이 명확하며, 애니메이션 로직 가까이에 정의할 수 있는 상수
const ANIMATION_DELAY_MS = 300;

async function onLikeClick() {
  await postLike(url);
  // 상수를 사용해 애니메이션과의 연결 관계를 유지
  await delay(ANIMATION_DELAY_MS);
  await refetchPostLike();
}
```

_상수는 의존하는 로직과 함께 관리하거나, 관계가 드러나도록 명확히 이름 붙이세요._

# 결합도 (Coupling)

코드베이스의 서로 다른 부분 사이의 의존성을 최소화합니다.

## 추상화와 결합도의 균형 (성급한 추상화 피하기)

**규칙:** 사용처가 앞으로 달라질 수 있다면 중복을 성급하게 추상화하지 말고, 낮은
결합도를 택합니다.

**이유:**

- 앞으로 달라질 수 있는 로직을 하나의 추상화에 억지로 밀어 넣어 생기는 강한 결합을
  피합니다.
- 미래 요구사항이 불확실할 때는 어느 정도의 중복을 허용하는 편이 결합도와
  유지보수성 측면에서 더 낫습니다.

#### 가이드:

추상화하기 전에, 그 로직이 정말로 동일하며 모든 사용처에서 앞으로도 계속 동일하게
_유지될지_ 를 따져 보세요. 달라질 여지가 있다면(예: `useOpenMaintenanceBottomSheet`
같은 공용 훅에서 페이지마다 조금씩 다른 동작이 필요한 경우), 처음에는 로직을
분리해 두는 편(중복 허용)이 더 유지보수하기 쉽고 결합도가 낮은 코드로 이어집니다.
트레이드오프는 팀과 논의하세요. _[이 항목은 단일 패턴이라기보다 상황에 대한 판단에
가깝기 때문에 별도의 '좋은 예시' 코드가 없습니다.]_

## 상태 관리의 범위 좁히기 (지나치게 넓은 훅 피하기)

**규칙:** 범위가 넓은 상태 관리는 더 작고 목적이 분명한 훅/컨텍스트로 나눕니다.

**이유:**

- 컴포넌트가 꼭 필요한 상태 조각에만 의존하게 되어 결합도가 낮아집니다.
- 무관한 상태 변경으로 인한 불필요한 리렌더링을 막아 성능이 좋아집니다.

#### 권장 패턴:

(목적이 분명한 훅, 낮은 결합도)

```typescript
// cardId 쿼리 파라미터 전용 훅
import { useQueryParam, NumberParam } from "use-query-params";
import { useCallback } from "react";

export function useCardIdQueryParam() {
  // 'query'가 원본 파라미터 값을 제공한다고 가정
  const [cardIdParam, setCardIdParam] = useQueryParam("cardId", NumberParam);

  const setCardId = useCallback(
    (newCardId: number | undefined) => {
      setCardIdParam(newCardId, "replaceIn"); // 원하는 히스토리 동작에 따라 'push'도 가능
    },
    [setCardIdParam]
  );

  // 안정적인 튜플을 반환
  return [cardIdParam ?? undefined, setCardId] as const;
}

// 날짜 범위 등은 별도의 훅으로 분리
// export function useDateRangeQueryParam() { /* ... */ }
```

이제 컴포넌트는 `cardId`가 필요할 때만 `useCardIdQueryParam`을 import해 사용하므로,
날짜 범위 상태 등과의 결합이 사라집니다.

## 컴포지션으로 Props Drilling 없애기

**규칙:** Props Drilling 대신 컴포넌트 컴포지션을 사용합니다.

**이유:**

- 불필요한 중간 의존성을 없애 결합도를 크게 낮춥니다.
- 컴포넌트 트리가 평평해져 리팩터링이 쉬워지고 데이터 흐름이 명확해집니다.

#### 권장 패턴:

```tsx
import React, { useState } from "react";

// Modal, Input, Button, ItemEditList 컴포넌트가 있다고 가정

function ItemEditModal({ open, items, recommendedItems, onConfirm, onClose }) {
  const [keyword, setKeyword] = useState("");

  // children을 Modal 안에서 직접 렌더링하고, props는 필요한 곳에만 전달
  return (
    <Modal open={open} onClose={onClose}>
      {/* Input과 Button을 직접 렌더링 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)} // 상태를 이곳에서 관리
          placeholder="Search items..."
        />
        <Button onClick={onClose}>Close</Button>
      </div>
      {/* ItemEditList를 직접 렌더링하고 필요한 props를 전달 */}
      <ItemEditList
        keyword={keyword} // 직접 전달
        items={items} // 직접 전달
        recommendedItems={recommendedItems} // 직접 전달
        onConfirm={onConfirm} // 직접 전달
      />
    </Modal>
  );
}

// 중간 컴포넌트인 ItemEditBody가 사라져 결합도가 낮아짐
```
